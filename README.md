# ProjectPilot Supplier Portal

Supplier registration and product management portal for ProjectPilot.

## Current Status / 当前状态

- Supabase 已接入：Auth + Postgres + Storage
- 電郵註冊採用 OTP（Resend 發送驗證碼）
- 註冊/編輯資料提交至後端 API；草稿保存在 localStorage
- 手機號註冊/登入已接入 Twilio Verify（短信 OTP + 密碼登入）

## Features / 核心功能

### Supplier Registration / 供應商註冊
- 多類型供應商：承包商、設計師、材料供應商、基礎供應商
- 公司與聯絡人信息
- 類型專屬問卷（項目案例、資質、保險、設計師名單等）
- 文件與圖片上傳（Supabase Storage）
- 草稿保存與提交

### Product Management / 產品管理（材料供應商）
- 產品新增/編輯/刪除
- SKU、類別、品牌、規格、價格、MOQ、交期等信息
- 產品圖片、規格文件、3D 模型上傳

### Dashboard / 儀表板
- 供應商概覽
- 產品目錄搜索與類別篩選
- 其他供應商名錄（已提交）

## Tech Stack / 技術棧

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database + Storage)
- Resend (Email OTP)
- Twilio Verify (SMS OTP)
- localStorage (draft cache)

## Setup / 配置

### Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=supplier-files
RESEND_API_KEY=
RESEND_FROM_EMAIL=
# or EMAIL_FROM as a fallback
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
```

### Database & Storage

Run the SQL in Supabase:

- `supabase/schema.sql` (tables + RLS + storage bucket)
- `supabase/storage.sql` (storage bucket + policies only, optional if schema already applied)

## Development / 運行

```bash
npm install
npm run dev
```

Open http://localhost:3000

## User Flow / 使用流程

1. 登入 / 註冊（Email OTP 或 SMS OTP）
2. 選擇供應商類型並填寫問卷
3. 保存草稿或提交
4. 進入儀表板管理資料與產品

## API Routes / API 端點

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/send-phone-otp`
- `POST /api/auth/verify-phone-otp`
- `POST /api/suppliers` (create/update supplier data)
- `GET /api/suppliers/me` (load current supplier)
- `GET /api/suppliers/basic` (supplier directory)
- `POST /api/products` (save material supplier products)

## Data Model / 數據模型（主要表）

- `suppliers`
- `supplier_company`, `supplier_contact`, `supplier_registration`, `supplier_commitments`
- `products`, `product_files`
- `supplier_documents`, `project_highlights`, `project_files`
- `project_managers`, `project_manager_projects`
- `designer_*`, `material_*`

## Project Structure / 項目結構

```
Supplier-Portal/
├── app/                 # Next.js App Router pages + API routes
├── components/          # Form components and questionnaires
├── lib/                 # Supabase clients and upload helpers
├── supabase/            # SQL schema and storage policies
├── types/               # TypeScript types
└── public/              # Static assets
```

## Notes / 注意事項

- 手機號註冊使用 Twilio Verify，需在 Supabase 開啟 Phone 登入
- 草稿保存在 localStorage，清除瀏覽器儲存會丟失未提交資料
- 邀請碼欄位目前未做後端校驗
