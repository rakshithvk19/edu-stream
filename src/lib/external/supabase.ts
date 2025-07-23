import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/lib/config';

// Singleton instances
let supabaseClient: SupabaseClient | null = null;
let supabaseServiceClient: SupabaseClient | null = null;

/**
 * Get Supabase client for public operations (with anon key)
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return supabaseClient;
}

/**
 * Get Supabase client for service operations (with service role key)
 */
export function getSupabaseServiceClient(): SupabaseClient {
  if (!supabaseServiceClient) {
    supabaseServiceClient = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return supabaseServiceClient;
}

/**
 * Validate Supabase configuration
 */
export function validateSupabaseConfig(): void {
  if (!config.supabase.url) {
    throw new Error('SUPABASE_URL is required');
  }

  if (!config.supabase.anonKey) {
    throw new Error('SUPABASE_ANON_KEY is required');
  }

  if (!config.supabase.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }

  // Validate URL format
  try {
    new URL(config.supabase.url);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL');
  }
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseServiceClient();
    
    // Simple query to test connection
    const { error } = await client
      .from('videos')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
}

/**
 * Get database health status
 */
export async function getSupabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const client = getSupabaseServiceClient();
    
    await client
      .from('videos')
      .select('id')
      .limit(1);

    const latency = Date.now() - startTime;

    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute database operation with error handling
 */
export async function executeSupabaseOperation<T>(
  operation: (client: SupabaseClient) => Promise<T>,
  useServiceClient: boolean = true
): Promise<T> {
  try {
    const client = useServiceClient ? getSupabaseServiceClient() : getSupabaseClient();
    return await operation(client);
  } catch (error) {
    console.error('Supabase operation failed:', error);
    throw new Error(
      `Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Close all Supabase connections (cleanup)
 */
export function closeSupabaseConnections(): void {
  if (supabaseClient) {
    // Supabase client doesn't have explicit close method
    // but we can reset the singleton
    supabaseClient = null;
  }
  
  if (supabaseServiceClient) {
    supabaseServiceClient = null;
  }
}

// Export types for convenience
export type { SupabaseClient } from '@supabase/supabase-js';
