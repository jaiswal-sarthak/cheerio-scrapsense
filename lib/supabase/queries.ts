
import { createClient } from "@supabase/supabase-js";
import {
  InstructionPayload,
  SettingsPayload,
} from "@/lib/validators/task";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase service client missing env configuration");
}

const serviceClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const db = {
  async getDashboardData(userId: string) {
    const { data, error } = await serviceClient
      .from("instructions")
      .select(
        `
        id,
        instruction_text,
        schedule_interval_hours,
        ai_generated_schema,
        created_at,
        site:sites (
          id,
          url,
          title,
          last_health_status
        ),
        last_run:scrape_runs!scrape_runs_instruction_id_fkey (
          run_status,
          run_time,
          error_message
        ),
        results(count)
      `,
      )
      .eq("site.user_id", userId)
      .limit(10);

    if (error) {
      throw error;
    }
    return data;
  },

  async getResults(userId: string, instructionIds?: string[]) {
    console.log(`[Query] Fetching results for user ${userId}`);

    let query = serviceClient
      .from("results")
      .select(`
              id,
              title,
              description,
              url,
              metadata,
              created_at,
              instruction_id,
              ai_summary
          `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (instructionIds && instructionIds.length > 0) {
      query = query.in("instruction_id", instructionIds);
    } else {
      // Fallback to filtering by user via join if no IDs provided (though we should always provide IDs)
      // But simpler to just return empty if no instructions found
      return [];
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Query] Error fetching results:", error);
      throw error;
    }

    console.log(`[Query] Found ${data?.length || 0} total results`);
    return data || [];
  },

  async getChangeLogs(userId: string) {
    const { data, error } = await serviceClient
      .from("change_logs")
      .select(
        `
        id,
        change_type,
        created_at,
        new_value,
        result:results!inner (
          id,
          title,
          url,
          instruction:instructions!inner (
            site:sites!inner ( user_id )
          )
        )
      `,
      )
      .eq("result.instruction.site.user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },

  async getSettings(userId: string) {
    const { data, error } = await serviceClient
      .from("settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }
    return data ?? null;
  },

  async saveSettings(userId: string, payload: SettingsPayload) {
    const existing = await serviceClient
      .from("settings")
      .select("*")
      .eq("user_id", userId)
      .single()
      .then((res) => (res.error ? null : res.data));
    if (existing) {
      const { error } = await serviceClient
        .from("settings")
        .update({
          telegram_chat_id: payload.telegramChatId,
          notification_email: payload.notificationEmail,
          alert_threshold: payload.alertThreshold,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (error) throw error;
      return this.getSettings(userId);
    }

    const { data, error } = await serviceClient
      .from("settings")
      .insert({
        user_id: userId,
        telegram_chat_id: payload.telegramChatId,
        notification_email: payload.notificationEmail,
        alert_threshold: payload.alertThreshold,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async upsertSite(payload: { url: string; title?: string; userId: string }) {
    const existing = await serviceClient
      .from("sites")
      .select("*")
      .eq("user_id", payload.userId)
      .eq("url", payload.url)
      .maybeSingle();
    if (existing.data) {
      return existing.data;
    }

    const { data, error } = await serviceClient
      .from("sites")
      .insert({
        url: payload.url,
        title: payload.title,
        user_id: payload.userId,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateInstruction(id: string, payload: { aiSchema: Record<string, unknown> }) {
    const { data, error } = await serviceClient
      .from("instructions")
      .update({
        ai_generated_schema: payload.aiSchema,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createInstruction(
    payload: InstructionPayload & { userId: string; aiSchema?: Record<string, unknown> },
  ) {
    const { data, error } = await serviceClient
      .from("instructions")
      .insert({
        site_id: payload.siteId,
        instruction_text: payload.instructionText,
        schedule_interval_hours: payload.scheduleIntervalHours,
        ai_generated_schema: payload.aiSchema ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async logScrapeRun({
    instructionId,
    status,
    errorMessage,
    durationMs,
  }: {
    instructionId: string;
    status: string;
    errorMessage?: string;
    durationMs?: number;
  }) {
    const { data, error } = await serviceClient
      .from("scrape_runs")
      .insert({
        instruction_id: instructionId,
        run_status: status,
        error_message: errorMessage ?? null,
        duration_ms: durationMs ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async insertResults(
    instructionId: string,
    results: Array<{
      title: string;
      description?: string;
      url: string;
      metadata?: Record<string, unknown>;
      ai_summary?: string;
    }>,
  ) {
    if (results.length === 0) return [];
    const payload = results.map((result) => ({
      instruction_id: instructionId,
      title: result.title,
      description: result.description ?? null,
      url: result.url,
      metadata: result.metadata ?? {},
      ai_summary: result.ai_summary ?? null,
    }));
    const { data, error } = await serviceClient
      .from("results")
      .insert(payload)
      .select();
    if (error) throw error;
    return data;
  },

  async getActiveInstructions() {
    const { data, error } = await serviceClient
      .from("instructions")
      .select(
        `
        id,
        instruction_text,
        ai_generated_schema,
        schedule_interval_hours,
        site:sites (
          id,
          url,
          user_id,
          title,
          last_health_status
        ),
        last_run:scrape_runs (
          run_time
        )
      `,
      )
      .eq("is_active", true)
      .order("run_time", { foreignTable: "scrape_runs", ascending: false })
      .limit(1, { foreignTable: "scrape_runs" });
    if (error) throw error;
    return data;
  },

  async updateSiteHealth(siteId: string, status: "healthy" | "degraded" | "failed") {
    const { error } = await serviceClient
      .from("sites")
      .update({ last_health_status: status })
      .eq("id", siteId);
    if (error) throw error;
  },

  async deleteInstruction(instructionId: string) {
    console.log(`[Delete] Attempting to delete instruction ${instructionId}`);

    // Delete the instruction directly (cascade will handle results and scrape_runs)
    const { error: deleteError } = await serviceClient
      .from("instructions")
      .delete()
      .eq("id", instructionId);

    if (deleteError) {
      console.error(`[Delete] Error deleting instruction:`, deleteError);
      throw deleteError;
    }

    console.log(`[Delete] Successfully deleted instruction ${instructionId}`);
  },

  // ============================================
  // Pending Tasks (Task Validation Workflow)
  // ============================================

  async createPendingTask(payload: {
    userId: string;
    url: string;
    title?: string;
    instructionText: string;
    scheduleIntervalHours: number;
    aiGeneratedSchema?: Record<string, unknown>;
    parsedInstruction?: Record<string, unknown>;
    validationStatus: string;
    validationErrors?: unknown[];
    validationWarnings?: unknown[];
    aiSuggestions?: unknown[];
    testResults?: unknown[];
    testResultCount?: number;
  }) {
    const { data, error } = await serviceClient
      .from("pending_tasks")
      .insert({
        user_id: payload.userId,
        url: payload.url,
        title: payload.title ?? null,
        instruction_text: payload.instructionText,
        schedule_interval_hours: payload.scheduleIntervalHours,
        ai_generated_schema: payload.aiGeneratedSchema ?? null,
        parsed_instruction: payload.parsedInstruction ?? null,
        validation_status: payload.validationStatus,
        validation_errors: payload.validationErrors ?? [],
        validation_warnings: payload.validationWarnings ?? [],
        ai_suggestions: payload.aiSuggestions ?? [],
        test_results: payload.testResults ?? [],
        test_result_count: payload.testResultCount ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPendingTasks(userId: string) {
    const { data, error } = await serviceClient
      .from("pending_tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPendingTask(id: string, userId: string) {
    const { data, error } = await serviceClient
      .from("pending_tasks")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updatePendingTask(
    id: string,
    userId: string,
    payload: {
      url?: string;
      title?: string;
      instructionText?: string;
      scheduleIntervalHours?: number;
      aiGeneratedSchema?: Record<string, unknown>;
      parsedInstruction?: Record<string, unknown>;
      validationStatus?: string;
      validationErrors?: unknown[];
      validationWarnings?: unknown[];
      aiSuggestions?: unknown[];
      testResults?: unknown[];
      testResultCount?: number;
    }
  ) {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.url !== undefined) updateData.url = payload.url;
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.instructionText !== undefined) updateData.instruction_text = payload.instructionText;
    if (payload.scheduleIntervalHours !== undefined) updateData.schedule_interval_hours = payload.scheduleIntervalHours;
    if (payload.aiGeneratedSchema !== undefined) updateData.ai_generated_schema = payload.aiGeneratedSchema;
    if (payload.parsedInstruction !== undefined) updateData.parsed_instruction = payload.parsedInstruction;
    if (payload.validationStatus !== undefined) updateData.validation_status = payload.validationStatus;
    if (payload.validationErrors !== undefined) updateData.validation_errors = payload.validationErrors;
    if (payload.validationWarnings !== undefined) updateData.validation_warnings = payload.validationWarnings;
    if (payload.aiSuggestions !== undefined) updateData.ai_suggestions = payload.aiSuggestions;
    if (payload.testResults !== undefined) updateData.test_results = payload.testResults;
    if (payload.testResultCount !== undefined) updateData.test_result_count = payload.testResultCount;

    const { data, error } = await serviceClient
      .from("pending_tasks")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePendingTask(id: string, userId: string) {
    const { error } = await serviceClient
      .from("pending_tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
  },

  async approvePendingTask(id: string, userId: string) {
    // Get the pending task
    const pendingTask = await this.getPendingTask(id, userId);

    // Create the site
    const site = await this.upsertSite({
      url: pendingTask.url,
      title: pendingTask.title ?? undefined,
      userId,
    });

    // Create the instruction
    const instruction = await this.createInstruction({
      siteId: site.id,
      instructionText: pendingTask.instruction_text,
      scheduleIntervalHours: pendingTask.schedule_interval_hours,
      aiSchema: pendingTask.ai_generated_schema as Record<string, unknown>,
      userId,
    });

    // Delete the pending task
    await this.deletePendingTask(id, userId);

    return instruction;
  },
};
