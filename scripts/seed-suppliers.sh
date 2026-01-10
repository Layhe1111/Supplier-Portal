#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local" >&2
  exit 1
fi

SUPABASE_URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | head -n1 | cut -d '=' -f2- | tr -d '\r')
SERVICE_ROLE_KEY=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | head -n1 | cut -d '=' -f2- | tr -d '\r')

if [[ -z "${SUPABASE_URL}" || -z "${SERVICE_ROLE_KEY}" ]]; then
  echo "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" >&2
  exit 1
fi

AUTH_HEADERS=(-H "apikey: ${SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")
SUPABASE_HOST=$(echo "$SUPABASE_URL" | sed -E 's~https?://([^/]+).*~\1~')
RESOLVED_IP=$(nslookup "$SUPABASE_HOST" | awk '$1=="Name:" {found=1} found && $1=="Address:" {print $2; exit}')
if [[ -z "$RESOLVED_IP" ]]; then
  echo "Failed to resolve Supabase host: ${SUPABASE_HOST}" >&2
  exit 1
fi
CURL_RESOLVE=(--resolve "${SUPABASE_HOST}:443:${RESOLVED_IP}")
CURL_BASE=(--retry 3 --retry-delay 1 --retry-connrefused --connect-timeout 10 --max-time 30 -sS)

post() {
  local table="$1"
  local payload="$2"
  curl "${CURL_BASE[@]}" -X POST "${SUPABASE_URL}/rest/v1/${table}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    "${AUTH_HEADERS[@]}" \
    "${CURL_RESOLVE[@]}" \
    -d "${payload}"
}

insert_one() {
  local table="$1"
  local payload="$2"
  local res
  res=$(post "$table" "$payload")
  local id
  id=$(echo "$res" | jq -r '.[0].id // empty')
  if [[ -z "$id" ]]; then
    echo "Insert failed (${table}): ${res}" >&2
    exit 1
  fi
  echo "$id"
}

insert_many() {
  local table="$1"
  local payload="$2"
  local res
  res=$(post "$table" "$payload")
  echo "$res" >/dev/null
}

count_rows() {
  local table="$1"
  local supplier_id="$2"
  curl "${CURL_BASE[@]}" "${SUPABASE_URL}/rest/v1/${table}?select=supplier_id&supplier_id=eq.${supplier_id}" \
    "${AUTH_HEADERS[@]}" \
    "${CURL_RESOLVE[@]}" | jq 'length'
}

now_iso() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

today_date() {
  date -u +"%Y-%m-%d"
}

seed_common() {
  local supplier_id="$1"
  local supplier_type="$2"
  local label="$3"
  local submission_date
  submission_date=$(today_date)

  insert_many "supplier_company" "$(jq -c -n \
    --arg supplier_id "$supplier_id" \
    --arg label "$label" \
    --arg supplier_type "$supplier_type" \
    '{supplier_id:$supplier_id,company_name_en:("Test " + $label + " Co."),company_name_zh:null,year_established:"2015",registered_capital:"5M",country:"HK",office_address:"1 Test Street, Central",hk_work_eligible_employees:"5",business_type:$label,business_description:("Seeded " + $supplier_type + " supplier"),company_supplement_link:"https://example.com",company_logo_path:null}'
  )"

  insert_many "supplier_registration" "$(jq -c -n \
    --arg supplier_id "$supplier_id" \
    --arg hk "HK-$(date +%s)" \
    --arg cn "CN-$(date +%s)" \
    --arg uscc "USCC-$(date +%s)" \
    '{supplier_id:$supplier_id,hk_business_registration_number:$hk,cn_business_registration_number:$cn,cn_unified_social_credit_code:$uscc}'
  )"

  insert_many "supplier_contact" "$(jq -c -n \
    --arg supplier_id "$supplier_id" \
    --arg submission_date "$submission_date" \
    --arg email "seed-${supplier_type}-$(date +%s)@example.com" \
    '{supplier_id:$supplier_id,contact_name:"Test Contact",contact_position:"Manager",contact_phone_code:"+852",contact_phone:"91234567",contact_email:$email,contact_fax:"1234-5678",submission_date:$submission_date}'
  )"

  insert_many "supplier_commitments" "$(jq -c -n \
    --arg supplier_id "$supplier_id" \
    '{supplier_id:$supplier_id,guarantee_info_true:true,accept_quality_supervision:true,agree_info_sharing:true}'
  )"
}

seed_basic() {
  local label="Basic Supplier"
  local supplier_id
  supplier_id=$(insert_one "suppliers" "$(jq -c -n \
    --arg user_id "$USER_ID" \
    --arg submitted_at "$(now_iso)" \
    '{user_id:$user_id,supplier_type:"basic",status:"submitted",submitted_at:$submitted_at}'
  )")
  seed_common "$supplier_id" "basic" "$label"
  echo "$supplier_id"
}

seed_contract() {
  local label="Contractor"
  local supplier_id
  supplier_id=$(insert_one "suppliers" "$(jq -c -n \
    --arg user_id "$USER_ID" \
    --arg submitted_at "$(now_iso)" \
    '{user_id:$user_id,supplier_type:"contractor",status:"submitted",submitted_at:$submitted_at}'
  )")

  seed_common "$supplier_id" "contractor" "$label"

  insert_many "contractor_profile" "$(jq -c -n \
    --arg supplier_id "$supplier_id" \
    '{supplier_id:$supplier_id,number_of_employees:"25",construction_grade:"RGBC",license_number:"LIC-12345",annual_construction_capacity:"20",max_concurrent_projects:"4",largest_project_value:"2000000",has_safety_officer:true,safety_officer_count:2,has_construction_manager:true,construction_manager_count:3,has_mep_lead:true,mep_lead_count:1,cn_hk_project_compliance:true,has_environmental_health_safety:true,has_incidents_past_3_years:false,has_litigation_past_3_years:false}'
  )"

  insert_many "supplier_project_types" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,scope:"contractor",project_type:"commercial"},{supplier_id:$supplier_id,scope:"contractor",project_type:"office"}]'
  )"

  local highlights
  highlights=$(post "project_highlights" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,scope:"contractor",project_name:"Contractor Project A",year:"2022",address:"Central",area:"1200",renovation_type:"newFitout",project_types:["commercial"],is_highlight:true},{supplier_id:$supplier_id,scope:"contractor",project_name:"Contractor Project B",year:"2021",address:"TST",area:"800",renovation_type:"remodel",project_types:["office"],is_highlight:false}]'
  )")

  local highlight_id1
  highlight_id1=$(echo "$highlights" | jq -r '.[0].id')
  local highlight_id2
  highlight_id2=$(echo "$highlights" | jq -r '.[1].id')

  insert_many "project_files" "$(jq -c -n --arg supplier_id "$supplier_id" --arg h1 "$highlight_id1" --arg h2 "$highlight_id2" \
    '[{supplier_id:$supplier_id,project_id:$h1,file_type:"photo",path:"seed/contractor/project-1.jpg"},{supplier_id:$supplier_id,project_id:$h2,file_type:"photo",path:"seed/contractor/project-2.jpg"}]'
  )"

  local managers
  managers=$(post "project_managers" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,scope:"contractor",name:"Alex Chan",years_experience:"10",languages:"EN,ZH",main_project:"Office Tower",year:"2020",address:"Wan Chai",area:"1500",cv_path:"seed/contractor/pm-cv.pdf"}]'
  )")

  local manager_id
  manager_id=$(echo "$managers" | jq -r '.[0].id')

  insert_many "project_manager_projects" "$(jq -c -n --arg supplier_id "$supplier_id" --arg manager_id "$manager_id" \
    '[{supplier_id:$supplier_id,project_manager_id:$manager_id,project_name:"PM Project 1",client_name:"Client A",year:"2019",building_name:"Tower A",area:"900"},{supplier_id:$supplier_id,project_manager_id:$manager_id,project_name:"PM Project 2",client_name:"Client B",year:"2021",building_name:"Tower B",area:"1100"}]'
  )"

  insert_many "supplier_certifications" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,scope:"contractor",cert_type:"iso",iso_code:"9001",name:null,file_path:"seed/contractor/iso-9001.pdf"},{supplier_id:$supplier_id,scope:"contractor",cert_type:"other",iso_code:null,name:"Safety Certificate",file_path:"seed/contractor/safety.pdf"}]'
  )"

  insert_many "supplier_insurances" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,scope:"contractor",insurance_type:"Liability",provider:"Test Insurance",expiry_date:"2026-12-31",file_path:"seed/contractor/insurance.pdf"}]'
  )"

  insert_many "supplier_documents" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[
      {supplier_id:$supplier_id,scope:"contractor",doc_type:"business_registration",path:"seed/contractor/business_registration.pdf",metadata:null},
      {supplier_id:$supplier_id,scope:"contractor",doc_type:"company_photos",path:"seed/contractor/company_photo.jpg",metadata:null},
      {supplier_id:$supplier_id,scope:"contractor",doc_type:"company_brochure",path:"seed/contractor/brochure-1.pdf",metadata:{index:0}},
      {supplier_id:$supplier_id,scope:"contractor",doc_type:"company_brochure",path:"seed/contractor/brochure-2.pdf",metadata:{index:1}},
      {supplier_id:$supplier_id,scope:"contractor",doc_type:"organization_chart",path:"seed/contractor/org-chart.pdf",metadata:null},
      {supplier_id:$supplier_id,scope:"contractor",doc_type:"certificate_upload",path:"seed/contractor/license.pdf",metadata:null},
      {supplier_id:$supplier_id,scope:"contractor",doc_type:"environmental_health_safety",path:"seed/contractor/ehs.pdf",metadata:null},
      {supplier_id:$supplier_id,scope:"contractor",doc_type:"incident_report",path:"seed/contractor/incidents.pdf",metadata:null},
      {supplier_id:$supplier_id,scope:"contractor",doc_type:"litigation_report",path:"seed/contractor/litigation.pdf",metadata:null}
    ]'
  )"

  echo "$supplier_id"
}

seed_designer() {
  local label="Designer"
  local supplier_id
  supplier_id=$(insert_one "suppliers" "$(jq -c -n \
    --arg user_id "$USER_ID" \
    --arg submitted_at "$(now_iso)" \
    '{user_id:$user_id,supplier_type:"designer",status:"submitted",submitted_at:$submitted_at}'
  )")

  seed_common "$supplier_id" "designer" "$label"

  insert_many "designer_profile" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '{supplier_id:$supplier_id,design_team_size:"12",bim_capability:true,can_do_design_build:true}'
  )"

  insert_many "designer_db_profile" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '{supplier_id:$supplier_id,construction_grade:"DB-Grade",license_number:"DB-LIC-123",annual_construction_capacity:"15",max_concurrent_projects:"3",largest_project_value:"1500000",has_safety_officer:true,safety_officer_count:1,has_construction_manager:true,construction_manager_count:2,has_mep_lead:false,mep_lead_count:0,cn_hk_project_compliance:true,has_environmental_health_safety:true,has_incidents_past_3_years:false,has_litigation_past_3_years:false}'
  )"

  insert_many "designer_awards" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,award:"Best Design 2022"},{supplier_id:$supplier_id,award:"Innovation Award 2023"}]'
  )"

  insert_many "designer_fee_structures" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,fee_type:"byArea"},{supplier_id:$supplier_id,fee_type:"byProject"}]'
  )"

  insert_many "designer_styles" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,style:"modernMinimalist"},{supplier_id:$supplier_id,style:"industrial"}]'
  )"

  insert_many "designer_software" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,software:"AutoCAD"},{supplier_id:$supplier_id,software:"SketchUp"}]'
  )"

  insert_many "supplier_project_types" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,scope:"designer",project_type:"residential"},{supplier_id:$supplier_id,scope:"designer",project_type:"commercial"},{supplier_id:$supplier_id,scope:"designer_db",project_type:"office"}]'
  )"

  local design_highlights
  design_highlights=$(post "project_highlights" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,scope:"designer",project_name:"Design Highlight A",year:"2023",address:"Central",area:"500",renovation_type:"newFitout",project_types:["residential"],is_highlight:true}]'
  )")

  local design_highlight_id
  design_highlight_id=$(echo "$design_highlights" | jq -r '.[0].id')

  insert_many "project_files" "$(jq -c -n --arg supplier_id "$supplier_id" --arg hid "$design_highlight_id" \
    '[{supplier_id:$supplier_id,project_id:$hid,file_type:"photo",path:"seed/designer/design-highlight.jpg"}]'
  )"

  local db_highlights
  db_highlights=$(post "project_highlights" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,scope:"designer_db",project_name:"DB Highlight A",year:"2022",address:"Kwun Tong",area:"900",renovation_type:"remodel",project_types:["office"],is_highlight:false}]'
  )")

  local db_highlight_id
  db_highlight_id=$(echo "$db_highlights" | jq -r '.[0].id')

  insert_many "project_files" "$(jq -c -n --arg supplier_id "$supplier_id" --arg hid "$db_highlight_id" \
    '[{supplier_id:$supplier_id,project_id:$hid,file_type:"photo",path:"seed/designer/db-highlight.jpg"}]'
  )"

  local designers
  designers=$(post "designers" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,name:"Jamie Lee",experience:"8",cv_path:"seed/designer/jamie-cv.pdf"},{supplier_id:$supplier_id,name:"Taylor Ng",experience:"5",cv_path:"seed/designer/taylor-cv.pdf"}]'
  )")

  local designer1_id
  designer1_id=$(echo "$designers" | jq -r '.[0].id')
  local designer2_id
  designer2_id=$(echo "$designers" | jq -r '.[1].id')

  local designer_projects
  designer_projects=$(post "designer_projects" "$(jq -c -n --arg supplier_id "$supplier_id" --arg d1 "$designer1_id" --arg d2 "$designer2_id" \
    '[{supplier_id:$supplier_id,designer_id:$d1,project_name:"Designer Project 1",year:"2021",address:"Admiralty",area:"600",renovation_type:"newFitout",project_types:["commercial"],is_highlight:true},{supplier_id:$supplier_id,designer_id:$d2,project_name:"Designer Project 2",year:"2020",address:"Causeway Bay",area:"450",renovation_type:"remodel",project_types:["residential"],is_highlight:false}]'
  )")

  local dp1
  dp1=$(echo "$designer_projects" | jq -r '.[0].id')
  local dp2
  dp2=$(echo "$designer_projects" | jq -r '.[1].id')

  insert_many "designer_project_files" "$(jq -c -n --arg supplier_id "$supplier_id" --arg dp1 "$dp1" --arg dp2 "$dp2" \
    '[{supplier_id:$supplier_id,designer_project_id:$dp1,file_type:"photo",path:"seed/designer/project-1.jpg"},{supplier_id:$supplier_id,designer_project_id:$dp2,file_type:"photo",path:"seed/designer/project-2.jpg"}]'
  )"

  local db_managers
  db_managers=$(post "project_managers" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,scope:"designer_db",name:"Morgan Ho",years_experience:"12",languages:"EN,ZH",main_project:"Mall Revamp",year:"2021",address:"Shatin",area:"1200",cv_path:"seed/designer/pm-cv.pdf"}]'
  )")

  local db_manager_id
  db_manager_id=$(echo "$db_managers" | jq -r '.[0].id')

  insert_many "project_manager_projects" "$(jq -c -n --arg supplier_id "$supplier_id" --arg manager_id "$db_manager_id" \
    '[{supplier_id:$supplier_id,project_manager_id:$manager_id,project_name:"DB PM Project 1",client_name:"Client C",year:"2020",building_name:"Mall C",area:"800"}]'
  )"

  insert_many "supplier_certifications" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,scope:"designer_db",cert_type:"iso",iso_code:"14001",name:null,file_path:"seed/designer/iso-14001.pdf"},{supplier_id:$supplier_id,scope:"designer_db",cert_type:"other",iso_code:null,name:"DB Safety Certificate",file_path:"seed/designer/db-safety.pdf"}]'
  )"

  insert_many "supplier_insurances" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,scope:"designer_db",insurance_type:"DB Liability",provider:"Test Insurance",expiry_date:"2026-10-01",file_path:"seed/designer/db-insurance.pdf"}]'
  )"

  insert_many "supplier_documents" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[
      {supplier_id:$supplier_id,scope:"designer",doc_type:"business_registration",path:"seed/designer/business_registration.pdf",metadata:null},
      {supplier_id:$supplier_id,scope:"designer",doc_type:"company_photos",path:"seed/designer/company_photo.jpg",metadata:null},
      {supplier_id:$supplier_id,scope:"designer",doc_type:"company_brochure",path:"seed/designer/brochure-1.pdf",metadata:{index:0}},
      {supplier_id:$supplier_id,scope:"designer",doc_type:"organization_chart",path:"seed/designer/org-chart.pdf",metadata:null},
      {supplier_id:$supplier_id,scope:"designer_db",doc_type:"certificate_upload",path:"seed/designer/db-license.pdf",metadata:null},
      {supplier_id:$supplier_id,scope:"designer_db",doc_type:"organization_chart",path:"seed/designer/db-org-chart.pdf",metadata:null},
      {supplier_id:$supplier_id,scope:"designer_db",doc_type:"environmental_health_safety",path:"seed/designer/db-ehs.pdf",metadata:null},
      {supplier_id:$supplier_id,scope:"designer_db",doc_type:"incident_report",path:"seed/designer/db-incidents.pdf",metadata:null},
      {supplier_id:$supplier_id,scope:"designer_db",doc_type:"litigation_report",path:"seed/designer/db-litigation.pdf",metadata:null}
    ]'
  )"

  echo "$supplier_id"
}

seed_material() {
  local label="Material Supplier"
  local supplier_id
  supplier_id=$(insert_one "suppliers" "$(jq -c -n \
    --arg user_id "$USER_ID" \
    --arg submitted_at "$(now_iso)" \
    '{user_id:$user_id,supplier_type:"material",status:"submitted",submitted_at:$submitted_at}'
  )")

  seed_common "$supplier_id" "material" "$label"

  insert_many "material_profile" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '{supplier_id:$supplier_id,sample_provided:true,sample_cost:"free",sample_delivery_time:"7 days",free_shipping_to_hk:true}'
  )"

  insert_many "material_company_types" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,company_type:"manufacturer"},{supplier_id:$supplier_id,company_type:"agent"}]'
  )"

  insert_many "material_represented_brands" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,brand_name:"Brand A"},{supplier_id:$supplier_id,brand_name:"Brand B"}]'
  )"

  insert_many "material_warehouses" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,address:"Warehouse 1",capacity:"500sqm"},{supplier_id:$supplier_id,address:"Warehouse 2",capacity:"300sqm"}]'
  )"

  local products
  products=$(post "products" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,sku:"MAT-001",product_name:"Acoustic Panel",category:"Wall",brand:"Brand A",series:"Series X",spec:"600x600",material:"Fiber",unit_price:120,moq:50,origin:"CN",lead_time_days:14,current_stock:300,specification_link:"https://example.com/spec"},{supplier_id:$supplier_id,sku:"MAT-002",product_name:"Floor Tile",category:"Floor",brand:"Brand B",series:"Series Y",spec:"300x300",material:"Ceramic",unit_price:80,moq:100,origin:"CN",lead_time_days:10,current_stock:500,specification_link:"https://example.com/spec-2"}]'
  )")

  local product1_id
  product1_id=$(echo "$products" | jq -r '.[0].id')
  local product2_id
  product2_id=$(echo "$products" | jq -r '.[1].id')

  insert_many "product_files" "$(jq -c -n --arg supplier_id "$supplier_id" --arg p1 "$product1_id" --arg p2 "$product2_id" \
    '[{supplier_id:$supplier_id,product_id:$p1,file_type:"photo",path:"seed/material/product-1.jpg"},{supplier_id:$supplier_id,product_id:$p1,file_type:"spec",path:"seed/material/product-1-spec.pdf"},{supplier_id:$supplier_id,product_id:$p1,file_type:"model3d",path:"seed/material/product-1-model.glb"},{supplier_id:$supplier_id,product_id:$p2,file_type:"photo",path:"seed/material/product-2.jpg"}]'
  )"

  local highlights
  highlights=$(post "project_highlights" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[{supplier_id:$supplier_id,scope:"material",project_name:"Material Project A",year:"2023",address:"Kowloon",area:"700",renovation_type:"newFitout",project_types:["commercial"],is_highlight:true}]'
  )")

  local highlight_id
  highlight_id=$(echo "$highlights" | jq -r '.[0].id')

  insert_many "project_files" "$(jq -c -n --arg supplier_id "$supplier_id" --arg hid "$highlight_id" \
    '[{supplier_id:$supplier_id,project_id:$hid,file_type:"photo",path:"seed/material/project-photo.jpg"}]'
  )"

  insert_many "supplier_documents" "$(jq -c -n --arg supplier_id "$supplier_id" \
    '[
      {supplier_id:$supplier_id,scope:"material",doc_type:"business_registration",path:"seed/material/business_registration.pdf",metadata:null},
      {supplier_id:$supplier_id,scope:"material",doc_type:"company_photos",path:"seed/material/company_photo.jpg",metadata:null},
      {supplier_id:$supplier_id,scope:"material",doc_type:"company_brochure",path:"seed/material/brochure-1.pdf",metadata:{index:0}}
    ]'
  )"

  echo "$supplier_id"
}

EMAIL="seed-$(date +%s)@example.com"
PASSWORD="Seed!$RANDOM""a"

USER_RES=$(curl "${CURL_BASE[@]}" -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "Content-Type: application/json" \
  "${AUTH_HEADERS[@]}" \
  "${CURL_RESOLVE[@]}" \
  -d "$(jq -c -n --arg email "$EMAIL" --arg password "$PASSWORD" '{email:$email,password:$password,email_confirm:true}')")

USER_ID=$(echo "$USER_RES" | jq -r '.id // .user.id // empty')
if [[ -z "$USER_ID" ]]; then
  echo "Failed to create user: ${USER_RES}" >&2
  exit 1
fi

echo "Created user: ${EMAIL}"

echo "Seeding basic..."
BASIC_ID=$(seed_basic)
BASIC_COUNTS=$(jq -c -n \
  --arg sc "$(count_rows supplier_company "$BASIC_ID")" \
  --arg sr "$(count_rows supplier_registration "$BASIC_ID")" \
  --arg sct "$(count_rows supplier_contact "$BASIC_ID")" \
  --arg scm "$(count_rows supplier_commitments "$BASIC_ID")" \
  '{supplier_company:$sc,supplier_registration:$sr,supplier_contact:$sct,supplier_commitments:$scm}')

echo "basic ${BASIC_ID} ${BASIC_COUNTS}"

echo "Seeding contractor..."
CONTRACTOR_ID=$(seed_contract)
CONTRACTOR_COUNTS=$(jq -c -n \
  --arg docs "$(count_rows supplier_documents "$CONTRACTOR_ID")" \
  --arg profile "$(count_rows contractor_profile "$CONTRACTOR_ID")" \
  --arg project_types "$(count_rows supplier_project_types "$CONTRACTOR_ID")" \
  --arg highlights "$(count_rows project_highlights "$CONTRACTOR_ID")" \
  --arg project_files "$(count_rows project_files "$CONTRACTOR_ID")" \
  --arg managers "$(count_rows project_managers "$CONTRACTOR_ID")" \
  --arg manager_projects "$(count_rows project_manager_projects "$CONTRACTOR_ID")" \
  --arg certs "$(count_rows supplier_certifications "$CONTRACTOR_ID")" \
  --arg ins "$(count_rows supplier_insurances "$CONTRACTOR_ID")" \
  '{supplier_documents:$docs,contractor_profile:$profile,supplier_project_types:$project_types,project_highlights:$highlights,project_files:$project_files,project_managers:$managers,project_manager_projects:$manager_projects,supplier_certifications:$certs,supplier_insurances:$ins}')

echo "contractor ${CONTRACTOR_ID} ${CONTRACTOR_COUNTS}"

echo "Seeding designer..."
DESIGNER_ID=$(seed_designer)
DESIGNER_COUNTS=$(jq -c -n \
  --arg docs "$(count_rows supplier_documents "$DESIGNER_ID")" \
  --arg profile "$(count_rows designer_profile "$DESIGNER_ID")" \
  --arg db_profile "$(count_rows designer_db_profile "$DESIGNER_ID")" \
  --arg awards "$(count_rows designer_awards "$DESIGNER_ID")" \
  --arg fees "$(count_rows designer_fee_structures "$DESIGNER_ID")" \
  --arg styles "$(count_rows designer_styles "$DESIGNER_ID")" \
  --arg software "$(count_rows designer_software "$DESIGNER_ID")" \
  --arg project_types "$(count_rows supplier_project_types "$DESIGNER_ID")" \
  --arg highlights "$(count_rows project_highlights "$DESIGNER_ID")" \
  --arg project_files "$(count_rows project_files "$DESIGNER_ID")" \
  --arg designers "$(count_rows designers "$DESIGNER_ID")" \
  --arg designer_projects "$(count_rows designer_projects "$DESIGNER_ID")" \
  --arg designer_files "$(count_rows designer_project_files "$DESIGNER_ID")" \
  --arg managers "$(count_rows project_managers "$DESIGNER_ID")" \
  --arg manager_projects "$(count_rows project_manager_projects "$DESIGNER_ID")" \
  --arg certs "$(count_rows supplier_certifications "$DESIGNER_ID")" \
  --arg ins "$(count_rows supplier_insurances "$DESIGNER_ID")" \
  '{supplier_documents:$docs,designer_profile:$profile,designer_db_profile:$db_profile,designer_awards:$awards,designer_fee_structures:$fees,designer_styles:$styles,designer_software:$software,supplier_project_types:$project_types,project_highlights:$highlights,project_files:$project_files,designers:$designers,designer_projects:$designer_projects,designer_project_files:$designer_files,project_managers:$managers,project_manager_projects:$manager_projects,supplier_certifications:$certs,supplier_insurances:$ins}')

echo "designer ${DESIGNER_ID} ${DESIGNER_COUNTS}"

echo "Seeding material..."
MATERIAL_ID=$(seed_material)
MATERIAL_COUNTS=$(jq -c -n \
  --arg docs "$(count_rows supplier_documents "$MATERIAL_ID")" \
  --arg profile "$(count_rows material_profile "$MATERIAL_ID")" \
  --arg company_types "$(count_rows material_company_types "$MATERIAL_ID")" \
  --arg brands "$(count_rows material_represented_brands "$MATERIAL_ID")" \
  --arg warehouses "$(count_rows material_warehouses "$MATERIAL_ID")" \
  --arg products "$(count_rows products "$MATERIAL_ID")" \
  --arg product_files "$(count_rows product_files "$MATERIAL_ID")" \
  --arg highlights "$(count_rows project_highlights "$MATERIAL_ID")" \
  --arg project_files "$(count_rows project_files "$MATERIAL_ID")" \
  '{supplier_documents:$docs,material_profile:$profile,material_company_types:$company_types,material_represented_brands:$brands,material_warehouses:$warehouses,products:$products,product_files:$product_files,project_highlights:$highlights,project_files:$project_files}')

echo "material ${MATERIAL_ID} ${MATERIAL_COUNTS}"

echo "Done. Seed user credentials: ${EMAIL} / ${PASSWORD}"
