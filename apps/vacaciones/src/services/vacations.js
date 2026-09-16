import { supabase } from '../lib/supabase.js';

export async function claimEmployeeProfile() {
  const { error } = await supabase.rpc('claim_employee_profile');
  if (error) throw error;
}

export async function getMyEmployee(authUserId) {
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, email, department, position, role, supervisor_id, active')
    .eq('auth_user_id', authUserId)
    .single();
  if (error) throw error;
  return data;
}

export async function listMyRequests(employeeId) {
  const { data, error } = await supabase
    .from('vacation_requests')
    .select('id, start_date, end_date, business_days, status, requested_at, reviewed_at, review_note')
    .eq('employee_id', employeeId)
    .order('requested_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listPendingApprovals() {
  const { data, error } = await supabase
    .from('vacation_requests')
    .select('id, employee_id, start_date, end_date, business_days, status, requested_at, employees!vacation_requests_employee_id_fkey(full_name, department)')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function checkAvailability(employeeId, startDate, endDate) {
  const { data, error } = await supabase.rpc('check_vacation_availability', {
    p_employee_id: employeeId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw error;
  return data;
}

export async function createVacationRequest(employeeId, startDate, endDate, note) {
  const { data, error } = await supabase
    .from('vacation_requests')
    .insert({
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate,
      employee_note: note || null,
    })
    .select('id, start_date, end_date, business_days, status, requested_at')
    .single();
  if (error) throw error;
  return data;
}

export async function reviewVacationRequest(requestId, decision, note) {
  const { data, error } = await supabase.rpc('review_vacation_request', {
    p_request_id: requestId,
    p_decision: decision,
    p_note: note || null,
  });
  if (error) throw error;
  return data;
}
