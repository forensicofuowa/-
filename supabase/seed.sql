do $$
declare
  v_org_id uuid;
  v_dept_id uuid;
  v_s1 uuid;
  v_s2 uuid;
  v_s3 uuid;
  v_s4 uuid;
begin
  insert into public.organizations (name, slug, max_upload_mb)
  values ('كلية العلوم - منصة قسم الادلة الجنائية ', 'forensic-learn', 50)
  on conflict (slug) do update set name = excluded.name
  returning id into v_org_id;

  select id into v_dept_id from public.departments where organization_id = v_org_id limit 1;
  if v_dept_id is null then
    insert into public.departments (organization_id, name, code)
    values (v_org_id, 'قسم الأدلة الجنائية', 'FOR-SCI')
    returning id into v_dept_id;
  end if;

  if not exists (select 1 from public.academic_years where organization_id = v_org_id) then
    insert into public.academic_years (organization_id, label, is_current)
    values (v_org_id, '2026-2027', true);
  end if;

  if not exists (select 1 from public.stages where department_id = v_dept_id) then
    insert into public.stages (department_id, name, level_number) values (v_dept_id, 'المرحلة الأولى', 1) returning id into v_s1;
    insert into public.stages (department_id, name, level_number) values (v_dept_id, 'المرحلة الثانية', 2) returning id into v_s2;
    insert into public.stages (department_id, name, level_number) values (v_dept_id, 'المرحلة الثالثة', 3) returning id into v_s3;
    insert into public.stages (department_id, name, level_number) values (v_dept_id, 'المرحلة الرابعة', 4) returning id into v_s4;

    insert into public.subjects (department_id, stage_id, name, code, description) values
      (v_dept_id, v_s1, 'مبادئ الأدلة الجنائية', 'FOR101', 'مدخل إلى العلوم الجنائية وإدارة مسرح الجريمة'),
      (v_dept_id, v_s1, 'الكيمياء العامة والتحليلية', 'CHM102', 'أساسيات التحليل الكيميائي للعينات'),
      (v_dept_id, v_s2, 'التحقيق الجنائي في مسرح الجريمة', 'FOR201', 'إجراءات الكشف والمعاينة ورفع الآثار المادية والبيولوجية'),
      (v_dept_id, v_s2, 'علم الوراثة والبيولوجيا الجزيئية', 'BIO204', 'الوراثة السكانية وتحليل الحمض النووي DNA'),
      (v_dept_id, v_s3, 'السموم والمخدرات الجنائية', 'TOX301', 'كشف وتحليل السموم في العينات الحيوية'),
      (v_dept_id, v_s4, 'الطب العدلي وتطبيقاته', 'MED401', 'تشريح وتقييم الإصابات والأدلة الطبية');
  end if;
end $$;
