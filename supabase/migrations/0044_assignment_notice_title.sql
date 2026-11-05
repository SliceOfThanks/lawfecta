-- Fix: the attorney's notice when a bench member joins a job named the job twice ("A change in who is working on X: X"),
-- because the engagement notice adds ": job title" itself. It now reads "A change in who is working on this job: X".
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_assignment_on_job(uuid)'::regprocedure) into v_src;
  if position('who is working on this job''' in v_src) > 0 then return; end if;
  v_new := replace(v_src, '''A change in who is working on '' || coalesce(v_title, ''your engagement'')', '''A change in who is working on this job''');
  if v_new = v_src then raise exception 'dela_assignment_on_job changed; update 0044'; end if;
  execute v_new;
end $$;
