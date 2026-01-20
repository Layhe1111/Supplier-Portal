-- Supplier Portal schema (v2, normalized)
-- Aligns with frontend supplier types: contractor, designer, material, basic.
-- Note: apply on a fresh database or migrate existing data.

create extension if not exists "pgcrypto";

-- Utility: updated_at trigger
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Suppliers
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  supplier_type text not null check (supplier_type in ('contractor', 'designer', 'material', 'basic')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists suppliers_user_idx on public.suppliers(user_id);
create index if not exists suppliers_type_status_idx on public.suppliers(supplier_type, status);
create trigger set_suppliers_updated_at before update on public.suppliers
  for each row execute procedure public.set_updated_at();

-- Company profile (shared fields)
create table if not exists public.supplier_company (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  company_name_en text,
  company_name_zh text,
  year_established text,
  registered_capital text,
  country text,
  office_address text,
  hk_work_eligible_employees text,
  business_type text,
  business_type_zh text,
  business_description text,
  company_supplement_link text,
  company_logo_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger set_supplier_company_updated_at before update on public.supplier_company
  for each row execute procedure public.set_updated_at();

-- Registration numbers (not used by basic suppliers)
create table if not exists public.supplier_registration (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  hk_business_registration_number text,
  cn_business_registration_number text,
  cn_unified_social_credit_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger set_supplier_registration_updated_at before update on public.supplier_registration
  for each row execute procedure public.set_updated_at();

-- Contact info
create table if not exists public.supplier_contact (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  contact_name text,
  contact_position text,
  contact_phone_code text,
  contact_phone text,
  contact_email text,
  contact_fax text,
  submission_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger set_supplier_contact_updated_at before update on public.supplier_contact
  for each row execute procedure public.set_updated_at();

-- Quality commitments
create table if not exists public.supplier_commitments (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  guarantee_info_true boolean,
  accept_quality_supervision boolean,
  agree_info_sharing boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger set_supplier_commitments_updated_at before update on public.supplier_commitments
  for each row execute procedure public.set_updated_at();

-- Documents (company-level uploads)
create table if not exists public.supplier_documents (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  scope text,
  doc_type text not null,
  path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists supplier_documents_supplier_idx on public.supplier_documents(supplier_id);
create index if not exists supplier_documents_type_idx on public.supplier_documents(doc_type);

-- Contractor profile
create table if not exists public.contractor_profile (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  number_of_employees text,
  construction_grade text,
  license_number text,
  annual_construction_capacity text,
  max_concurrent_projects text,
  largest_project_value text,
  has_safety_officer boolean,
  safety_officer_count integer,
  has_construction_manager boolean,
  construction_manager_count integer,
  has_mep_lead boolean,
  mep_lead_count integer,
  cn_hk_project_compliance boolean,
  has_environmental_health_safety boolean,
  has_incidents_past_3_years boolean,
  has_litigation_past_3_years boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger set_contractor_profile_updated_at before update on public.contractor_profile
  for each row execute procedure public.set_updated_at();

-- Designer profile
create table if not exists public.designer_profile (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  design_team_size text,
  bim_capability boolean,
  can_do_design_build boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger set_designer_profile_updated_at before update on public.designer_profile
  for each row execute procedure public.set_updated_at();

-- Designer design/build profile
create table if not exists public.designer_db_profile (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  construction_grade text,
  license_number text,
  annual_construction_capacity text,
  max_concurrent_projects text,
  largest_project_value text,
  has_safety_officer boolean,
  safety_officer_count integer,
  has_construction_manager boolean,
  construction_manager_count integer,
  has_mep_lead boolean,
  mep_lead_count integer,
  cn_hk_project_compliance boolean,
  has_environmental_health_safety boolean,
  has_incidents_past_3_years boolean,
  has_litigation_past_3_years boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger set_designer_db_profile_updated_at before update on public.designer_db_profile
  for each row execute procedure public.set_updated_at();

-- Material profile
create table if not exists public.material_profile (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  sample_provided boolean,
  sample_cost text,
  sample_delivery_time text,
  free_shipping_to_hk boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger set_material_profile_updated_at before update on public.material_profile
  for each row execute procedure public.set_updated_at();

-- Project type selections
create table if not exists public.supplier_project_types (
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  scope text not null,
  project_type text not null,
  created_at timestamptz default now(),
  primary key (supplier_id, scope, project_type)
);
create index if not exists supplier_project_types_supplier_idx on public.supplier_project_types(supplier_id);

-- Project highlights
create table if not exists public.project_highlights (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  scope text not null,
  project_name text,
  year text,
  address text,
  area text,
  renovation_type text,
  project_types text[],
  is_highlight boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists project_highlights_supplier_idx on public.project_highlights(supplier_id);
create index if not exists project_highlights_scope_idx on public.project_highlights(scope);
create trigger set_project_highlights_updated_at before update on public.project_highlights
  for each row execute procedure public.set_updated_at();

-- Project highlight files
create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  project_id uuid not null references public.project_highlights(id) on delete cascade,
  file_type text not null default 'photo',
  path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz default now()
);
create index if not exists project_files_project_idx on public.project_files(project_id);

-- Project managers
create table if not exists public.project_managers (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  scope text not null,
  name text,
  years_experience text,
  languages text,
  main_project text,
  year text,
  address text,
  area text,
  cv_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists project_managers_supplier_idx on public.project_managers(supplier_id);
create trigger set_project_managers_updated_at before update on public.project_managers
  for each row execute procedure public.set_updated_at();

create table if not exists public.project_manager_projects (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  project_manager_id uuid not null references public.project_managers(id) on delete cascade,
  project_name text,
  client_name text,
  year text,
  building_name text,
  area text,
  created_at timestamptz default now()
);
create index if not exists project_manager_projects_manager_idx on public.project_manager_projects(project_manager_id);

-- Designers (staff)
create table if not exists public.designers (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  name text,
  experience text,
  languages text,
  cv_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists designers_supplier_idx on public.designers(supplier_id);
create trigger set_designers_updated_at before update on public.designers
  for each row execute procedure public.set_updated_at();

create table if not exists public.designer_projects (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  designer_id uuid not null references public.designers(id) on delete cascade,
  project_name text,
  year text,
  address text,
  area text,
  renovation_type text,
  project_types text[],
  is_highlight boolean,
  created_at timestamptz default now()
);
create index if not exists designer_projects_designer_idx on public.designer_projects(designer_id);

create table if not exists public.designer_project_files (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  designer_project_id uuid not null references public.designer_projects(id) on delete cascade,
  file_type text not null default 'photo',
  path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz default now()
);
create index if not exists designer_project_files_project_idx on public.designer_project_files(designer_project_id);

-- Designer lists
create table if not exists public.designer_awards (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  award text not null,
  created_at timestamptz default now()
);
create index if not exists designer_awards_supplier_idx on public.designer_awards(supplier_id);

create table if not exists public.designer_fee_structures (
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  fee_type text not null,
  created_at timestamptz default now(),
  primary key (supplier_id, fee_type)
);

create table if not exists public.designer_styles (
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  style text not null,
  created_at timestamptz default now(),
  primary key (supplier_id, style)
);

create table if not exists public.designer_software (
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  software text not null,
  created_at timestamptz default now(),
  primary key (supplier_id, software)
);

-- Certifications and insurances
create table if not exists public.supplier_certifications (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  scope text not null,
  cert_type text not null,
  iso_code text,
  name text,
  file_path text,
  created_at timestamptz default now()
);
create index if not exists supplier_certifications_supplier_idx on public.supplier_certifications(supplier_id);

create table if not exists public.supplier_insurances (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  scope text not null,
  insurance_type text,
  provider text,
  expiry_date date,
  file_path text,
  created_at timestamptz default now()
);
create index if not exists supplier_insurances_supplier_idx on public.supplier_insurances(supplier_id);

-- Material lists
create table if not exists public.material_company_types (
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  company_type text not null,
  created_at timestamptz default now(),
  primary key (supplier_id, company_type)
);

create table if not exists public.material_represented_brands (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  brand_name text not null,
  created_at timestamptz default now()
);
create index if not exists material_represented_brands_supplier_idx on public.material_represented_brands(supplier_id);

create table if not exists public.material_warehouses (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  address text,
  capacity text,
  created_at timestamptz default now()
);
create index if not exists material_warehouses_supplier_idx on public.material_warehouses(supplier_id);

-- Products (material suppliers)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  sku text,
  product_name text not null,
  category text not null,
  brand text not null,
  series text,
  spec text,
  material text,
  unit_price numeric,
  moq integer,
  origin text,
  lead_time_days integer,
  current_stock integer,
  specification_link text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists products_supplier_idx on public.products(supplier_id);
create index if not exists products_category_idx on public.products(category);
create index if not exists products_sku_idx on public.products(sku);
create trigger set_products_updated_at before update on public.products
  for each row execute procedure public.set_updated_at();

create table if not exists public.product_files (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  file_type text not null,
  path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz default now()
);
create index if not exists product_files_product_idx on public.product_files(product_id);

-- OTP table for email signup
create table if not exists public.email_otps (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Optional invite codes
create table if not exists public.invite_codes (
  id serial primary key,
  code varchar not null unique,
  max_uses integer,
  used_count integer default 0,
  status text not null default 'active',
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists invite_codes_status_idx on public.invite_codes(status);
create trigger set_invite_codes_updated_at before update on public.invite_codes
  for each row execute procedure public.set_updated_at();

-- Helper: owner check
create or replace function public.is_supplier_owner(_supplier_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.suppliers s
    where s.id = _supplier_id
      and s.user_id = auth.uid()
  );
$$;

-- Row-Level Security
alter table public.suppliers enable row level security;
alter table public.supplier_company enable row level security;
alter table public.supplier_registration enable row level security;
alter table public.supplier_contact enable row level security;
alter table public.supplier_commitments enable row level security;
alter table public.supplier_documents enable row level security;
alter table public.contractor_profile enable row level security;
alter table public.designer_profile enable row level security;
alter table public.designer_db_profile enable row level security;
alter table public.material_profile enable row level security;
alter table public.supplier_project_types enable row level security;
alter table public.project_highlights enable row level security;
alter table public.project_files enable row level security;
alter table public.project_managers enable row level security;
alter table public.project_manager_projects enable row level security;
alter table public.designers enable row level security;
alter table public.designer_projects enable row level security;
alter table public.designer_project_files enable row level security;
alter table public.designer_awards enable row level security;
alter table public.designer_fee_structures enable row level security;
alter table public.designer_styles enable row level security;
alter table public.designer_software enable row level security;
alter table public.supplier_certifications enable row level security;
alter table public.supplier_insurances enable row level security;
alter table public.material_company_types enable row level security;
alter table public.material_represented_brands enable row level security;
alter table public.material_warehouses enable row level security;
alter table public.products enable row level security;
alter table public.product_files enable row level security;
alter table public.email_otps enable row level security;
alter table public.invite_codes enable row level security;

create policy suppliers_select_own on public.suppliers
  for select using (user_id = auth.uid());
create policy suppliers_insert_own on public.suppliers
  for insert with check (user_id = auth.uid());
create policy suppliers_update_own on public.suppliers
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy suppliers_delete_own on public.suppliers
  for delete using (user_id = auth.uid());

create policy supplier_company_select_own on public.supplier_company
  for select using (public.is_supplier_owner(supplier_id));
create policy supplier_company_insert_own on public.supplier_company
  for insert with check (public.is_supplier_owner(supplier_id));
create policy supplier_company_update_own on public.supplier_company
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy supplier_company_delete_own on public.supplier_company
  for delete using (public.is_supplier_owner(supplier_id));

create policy supplier_registration_select_own on public.supplier_registration
  for select using (public.is_supplier_owner(supplier_id));
create policy supplier_registration_insert_own on public.supplier_registration
  for insert with check (public.is_supplier_owner(supplier_id));
create policy supplier_registration_update_own on public.supplier_registration
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy supplier_registration_delete_own on public.supplier_registration
  for delete using (public.is_supplier_owner(supplier_id));

create policy supplier_contact_select_own on public.supplier_contact
  for select using (public.is_supplier_owner(supplier_id));
create policy supplier_contact_insert_own on public.supplier_contact
  for insert with check (public.is_supplier_owner(supplier_id));
create policy supplier_contact_update_own on public.supplier_contact
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy supplier_contact_delete_own on public.supplier_contact
  for delete using (public.is_supplier_owner(supplier_id));

create policy supplier_commitments_select_own on public.supplier_commitments
  for select using (public.is_supplier_owner(supplier_id));
create policy supplier_commitments_insert_own on public.supplier_commitments
  for insert with check (public.is_supplier_owner(supplier_id));
create policy supplier_commitments_update_own on public.supplier_commitments
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy supplier_commitments_delete_own on public.supplier_commitments
  for delete using (public.is_supplier_owner(supplier_id));

create policy supplier_documents_select_own on public.supplier_documents
  for select using (public.is_supplier_owner(supplier_id));
create policy supplier_documents_insert_own on public.supplier_documents
  for insert with check (public.is_supplier_owner(supplier_id));
create policy supplier_documents_update_own on public.supplier_documents
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy supplier_documents_delete_own on public.supplier_documents
  for delete using (public.is_supplier_owner(supplier_id));

create policy contractor_profile_select_own on public.contractor_profile
  for select using (public.is_supplier_owner(supplier_id));
create policy contractor_profile_insert_own on public.contractor_profile
  for insert with check (public.is_supplier_owner(supplier_id));
create policy contractor_profile_update_own on public.contractor_profile
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy contractor_profile_delete_own on public.contractor_profile
  for delete using (public.is_supplier_owner(supplier_id));

create policy designer_profile_select_own on public.designer_profile
  for select using (public.is_supplier_owner(supplier_id));
create policy designer_profile_insert_own on public.designer_profile
  for insert with check (public.is_supplier_owner(supplier_id));
create policy designer_profile_update_own on public.designer_profile
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy designer_profile_delete_own on public.designer_profile
  for delete using (public.is_supplier_owner(supplier_id));

create policy designer_db_profile_select_own on public.designer_db_profile
  for select using (public.is_supplier_owner(supplier_id));
create policy designer_db_profile_insert_own on public.designer_db_profile
  for insert with check (public.is_supplier_owner(supplier_id));
create policy designer_db_profile_update_own on public.designer_db_profile
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy designer_db_profile_delete_own on public.designer_db_profile
  for delete using (public.is_supplier_owner(supplier_id));

create policy material_profile_select_own on public.material_profile
  for select using (public.is_supplier_owner(supplier_id));
create policy material_profile_insert_own on public.material_profile
  for insert with check (public.is_supplier_owner(supplier_id));
create policy material_profile_update_own on public.material_profile
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy material_profile_delete_own on public.material_profile
  for delete using (public.is_supplier_owner(supplier_id));

create policy supplier_project_types_select_own on public.supplier_project_types
  for select using (public.is_supplier_owner(supplier_id));
create policy supplier_project_types_insert_own on public.supplier_project_types
  for insert with check (public.is_supplier_owner(supplier_id));
create policy supplier_project_types_update_own on public.supplier_project_types
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy supplier_project_types_delete_own on public.supplier_project_types
  for delete using (public.is_supplier_owner(supplier_id));

create policy project_highlights_select_own on public.project_highlights
  for select using (public.is_supplier_owner(supplier_id));
create policy project_highlights_insert_own on public.project_highlights
  for insert with check (public.is_supplier_owner(supplier_id));
create policy project_highlights_update_own on public.project_highlights
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy project_highlights_delete_own on public.project_highlights
  for delete using (public.is_supplier_owner(supplier_id));

create policy project_files_select_own on public.project_files
  for select using (public.is_supplier_owner(supplier_id));
create policy project_files_insert_own on public.project_files
  for insert with check (public.is_supplier_owner(supplier_id));
create policy project_files_update_own on public.project_files
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy project_files_delete_own on public.project_files
  for delete using (public.is_supplier_owner(supplier_id));

create policy project_managers_select_own on public.project_managers
  for select using (public.is_supplier_owner(supplier_id));
create policy project_managers_insert_own on public.project_managers
  for insert with check (public.is_supplier_owner(supplier_id));
create policy project_managers_update_own on public.project_managers
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy project_managers_delete_own on public.project_managers
  for delete using (public.is_supplier_owner(supplier_id));

create policy project_manager_projects_select_own on public.project_manager_projects
  for select using (public.is_supplier_owner(supplier_id));
create policy project_manager_projects_insert_own on public.project_manager_projects
  for insert with check (public.is_supplier_owner(supplier_id));
create policy project_manager_projects_update_own on public.project_manager_projects
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy project_manager_projects_delete_own on public.project_manager_projects
  for delete using (public.is_supplier_owner(supplier_id));

create policy designers_select_own on public.designers
  for select using (public.is_supplier_owner(supplier_id));
create policy designers_insert_own on public.designers
  for insert with check (public.is_supplier_owner(supplier_id));
create policy designers_update_own on public.designers
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy designers_delete_own on public.designers
  for delete using (public.is_supplier_owner(supplier_id));

create policy designer_projects_select_own on public.designer_projects
  for select using (public.is_supplier_owner(supplier_id));
create policy designer_projects_insert_own on public.designer_projects
  for insert with check (public.is_supplier_owner(supplier_id));
create policy designer_projects_update_own on public.designer_projects
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy designer_projects_delete_own on public.designer_projects
  for delete using (public.is_supplier_owner(supplier_id));

create policy designer_project_files_select_own on public.designer_project_files
  for select using (public.is_supplier_owner(supplier_id));
create policy designer_project_files_insert_own on public.designer_project_files
  for insert with check (public.is_supplier_owner(supplier_id));
create policy designer_project_files_update_own on public.designer_project_files
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy designer_project_files_delete_own on public.designer_project_files
  for delete using (public.is_supplier_owner(supplier_id));

create policy designer_awards_select_own on public.designer_awards
  for select using (public.is_supplier_owner(supplier_id));
create policy designer_awards_insert_own on public.designer_awards
  for insert with check (public.is_supplier_owner(supplier_id));
create policy designer_awards_update_own on public.designer_awards
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy designer_awards_delete_own on public.designer_awards
  for delete using (public.is_supplier_owner(supplier_id));

create policy designer_fee_structures_select_own on public.designer_fee_structures
  for select using (public.is_supplier_owner(supplier_id));
create policy designer_fee_structures_insert_own on public.designer_fee_structures
  for insert with check (public.is_supplier_owner(supplier_id));
create policy designer_fee_structures_update_own on public.designer_fee_structures
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy designer_fee_structures_delete_own on public.designer_fee_structures
  for delete using (public.is_supplier_owner(supplier_id));

create policy designer_styles_select_own on public.designer_styles
  for select using (public.is_supplier_owner(supplier_id));
create policy designer_styles_insert_own on public.designer_styles
  for insert with check (public.is_supplier_owner(supplier_id));
create policy designer_styles_update_own on public.designer_styles
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy designer_styles_delete_own on public.designer_styles
  for delete using (public.is_supplier_owner(supplier_id));

create policy designer_software_select_own on public.designer_software
  for select using (public.is_supplier_owner(supplier_id));
create policy designer_software_insert_own on public.designer_software
  for insert with check (public.is_supplier_owner(supplier_id));
create policy designer_software_update_own on public.designer_software
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy designer_software_delete_own on public.designer_software
  for delete using (public.is_supplier_owner(supplier_id));

create policy supplier_certifications_select_own on public.supplier_certifications
  for select using (public.is_supplier_owner(supplier_id));
create policy supplier_certifications_insert_own on public.supplier_certifications
  for insert with check (public.is_supplier_owner(supplier_id));
create policy supplier_certifications_update_own on public.supplier_certifications
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy supplier_certifications_delete_own on public.supplier_certifications
  for delete using (public.is_supplier_owner(supplier_id));

create policy supplier_insurances_select_own on public.supplier_insurances
  for select using (public.is_supplier_owner(supplier_id));
create policy supplier_insurances_insert_own on public.supplier_insurances
  for insert with check (public.is_supplier_owner(supplier_id));
create policy supplier_insurances_update_own on public.supplier_insurances
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy supplier_insurances_delete_own on public.supplier_insurances
  for delete using (public.is_supplier_owner(supplier_id));

create policy material_company_types_select_own on public.material_company_types
  for select using (public.is_supplier_owner(supplier_id));
create policy material_company_types_insert_own on public.material_company_types
  for insert with check (public.is_supplier_owner(supplier_id));
create policy material_company_types_update_own on public.material_company_types
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy material_company_types_delete_own on public.material_company_types
  for delete using (public.is_supplier_owner(supplier_id));

create policy material_represented_brands_select_own on public.material_represented_brands
  for select using (public.is_supplier_owner(supplier_id));
create policy material_represented_brands_insert_own on public.material_represented_brands
  for insert with check (public.is_supplier_owner(supplier_id));
create policy material_represented_brands_update_own on public.material_represented_brands
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy material_represented_brands_delete_own on public.material_represented_brands
  for delete using (public.is_supplier_owner(supplier_id));

create policy material_warehouses_select_own on public.material_warehouses
  for select using (public.is_supplier_owner(supplier_id));
create policy material_warehouses_insert_own on public.material_warehouses
  for insert with check (public.is_supplier_owner(supplier_id));
create policy material_warehouses_update_own on public.material_warehouses
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy material_warehouses_delete_own on public.material_warehouses
  for delete using (public.is_supplier_owner(supplier_id));

create policy products_select_own on public.products
  for select using (public.is_supplier_owner(supplier_id));
create policy products_insert_own on public.products
  for insert with check (public.is_supplier_owner(supplier_id));
create policy products_update_own on public.products
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy products_delete_own on public.products
  for delete using (public.is_supplier_owner(supplier_id));

create policy product_files_select_own on public.product_files
  for select using (public.is_supplier_owner(supplier_id));
create policy product_files_insert_own on public.product_files
  for insert with check (public.is_supplier_owner(supplier_id));
create policy product_files_update_own on public.product_files
  for update using (public.is_supplier_owner(supplier_id)) with check (public.is_supplier_owner(supplier_id));
create policy product_files_delete_own on public.product_files
  for delete using (public.is_supplier_owner(supplier_id));

-- Storage: create bucket (private by default)
insert into storage.buckets (id, name, public)
values ('supplier-files', 'supplier-files', false)
on conflict (id) do nothing;

-- Storage RLS
alter table storage.objects enable row level security;

create policy "storage_select_own" on storage.objects
  for select to authenticated using (bucket_id = 'supplier-files' and owner = auth.uid());

create policy "storage_insert_own" on storage.objects
  for insert to authenticated with check (bucket_id = 'supplier-files' and owner = auth.uid());

create policy "storage_update_own" on storage.objects
  for update to authenticated using (bucket_id = 'supplier-files' and owner = auth.uid())
  with check (bucket_id = 'supplier-files' and owner = auth.uid());

create policy "storage_delete_own" on storage.objects
  for delete to authenticated using (bucket_id = 'supplier-files' and owner = auth.uid());

-- Service role bypasses RLS by default.
