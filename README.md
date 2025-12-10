# ProjectPilot Supplier Portal

供應商註冊與產品管理門戶

A minimalist supplier registration and product management portal built with Next.js.

## 項目簡介 / Overview

這是一個專為供應商設計的註冊和產品管理系統，允許供應商註冊公司信息並管理產品目錄。目前為純前端實現，使用 localStorage 存儲數據，後期將接入 Supabase 作為後端。

This is a supplier registration and product management system designed for suppliers to register their company information and manage product catalogs. Currently implemented as a frontend-only application using localStorage, with plans to integrate Supabase as the backend.

## 核心功能 / Key Features

### 供應商註冊 / Supplier Registration
- 多類型供應商支持（材料供應商、施工方、設計師）
- 公司基本信息管理（公司名稱、執照、註冊資本等）
- 聯繫人信息
- 業務範圍和品牌代理
- 營業文件上傳

### 產品管理 / Product Management
- 註冊時或註冊後添加產品
- 完整的產品信息：SKU、名稱、類別、品牌、材質、規格
- 價格、最小起訂量（MOQ）、交貨周期
- 產品描述和圖片上傳
- 產品目錄搜索和篩選

### 儀表板 / Dashboard
- 產品概覽和統計
- 按 SKU、名稱或品牌搜索產品
- 按類別篩選產品
- 編輯公司信息
- 添加更多產品

### 智能功能 / Smart Features
- 自動保存草稿（每秒）
- 表單驗證
- 中英文雙語界面
- 響應式設計
- 極簡 UI

## 技術棧 / Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Storage**: localStorage (純前端)
- **Future Backend**: Supabase (計劃中)

## 快速開始 / Quick Start

### 安裝與運行 / Installation

```bash
# 克隆項目
git clone <repository-url>

# 安裝依賴
npm install

# 啟動開發服務器
npm run dev

# 訪問應用
# 打開瀏覽器訪問 http://localhost:3000
```

### 生產構建 / Production Build

```bash
npm run build
npm start
```

## 項目結構 / Project Structure

```
Supplier-Portal/
├── app/
│   ├── page.tsx                          # 登入頁面
│   ├── register/
│   │   └── supplier/page.tsx             # 供應商註冊頁面
│   ├── dashboard/page.tsx                # 儀表板
│   ├── layout.tsx                        # 根佈局
│   └── globals.css                       # 全局樣式
├── components/
│   ├── FormInput.tsx                     # 輸入框組件
│   ├── FormCheckbox.tsx                  # 複選框組件
│   ├── FileUpload.tsx                    # 文件上傳組件
│   ├── FormSection.tsx                   # 表單分區組件
│   ├── ProductModal.tsx                  # 產品彈窗組件
│   ├── MultiSelectWithSearch.tsx         # 多選搜索組件
│   └── questionnaires/                   # 問卷組件
│       ├── CommonRequirements.tsx        # 公共要求組件
│       ├── MaterialSupplierQuestionnaire.tsx
│       ├── ContractorQuestionnaire.tsx
│       └── DesignerQuestionnaire.tsx
├── types/
│   └── supplier.ts                       # TypeScript 類型定義
└── public/                               # 靜態資源
```

## 使用流程 / User Flow

### 1. 登入頁面
訪問首頁，點擊"新供應商？點此註冊"進入註冊流程。

### 2. 供應商註冊
- 選擇供應商類型（材料供應商、施工方、設計師）
- 填寫公司基本信息
- 填寫聯繫人信息
- 根據供應商類型填寫專屬問卷
- 添加產品（可選）
- 上傳相關文件
- 同意條款並提交

### 3. 儀表板
- 查看產品概覽和統計數據
- 搜索和篩選產品
- 編輯公司信息
- 添加更多產品

## 測試數據 / Sample Data

### 公司信息
```
公司名稱: Premium Furniture Co., Ltd.
營業執照: BL2024001234
成立年份: 2015
註冊資本: HKD 2,000,000
公司地址: 香港九龍彌敦道123號A座1501室
業務範圍: 家具、家居裝飾、建材、照明
代理品牌: ModernLine, ClassicHome, UrbanStyle
```

### 聯繫信息
```
聯繫人: John Chan
職位: 銷售經理
電話: +852 9123 4567
電郵: john.chan@premiumfurniture.com
```

### 示例產品
```
SKU: PF-SOFA-001
產品名稱: 現代布藝沙發
類別: 家具
品牌: ModernLine
材質: 優質布料、實木框架
規格: 200cm x 90cm x 85cm
單價: HKD 5,800
MOQ: 10
交貨周期: 14天
描述: 現代設計沙發，配備高密度泡沫坐墊和可拆卸布套，適合現代生活空間。
```

## 後端集成計劃 / Backend Integration Plan

項目將接入 **Supabase** 作為後端解決方案：

### Supabase 功能集成
- **Authentication**: 用戶認證和授權
- **Database**: PostgreSQL 數據庫存儲供應商和產品數據
- **Storage**: 文件和圖片存儲
- **Real-time**: 實時數據更新（可選）

### API 端點規劃
```
POST   /api/auth/register        # 供應商註冊
POST   /api/auth/login           # 登入
GET    /api/suppliers/:id        # 獲取供應商信息
PUT    /api/suppliers/:id        # 更新供應商信息
GET    /api/products              # 獲取產品列表
POST   /api/products              # 創建產品
PUT    /api/products/:id         # 更新產品
DELETE /api/products/:id         # 刪除產品
```

### 數據表結構
- `suppliers` - 供應商基本信息
- `products` - 產品信息
- `files` - 文件上傳記錄
- `users` - 用戶認證信息

## 注意事項 / Notes

- 當前使用 localStorage 存儲數據，僅在瀏覽器本地保存
- 清除瀏覽器緩存將重置所有數據
- 文件上傳功能在純前端模式下為模擬實現
- 自動保存功能每秒運行一次，防止數據丟失

## License

This project is proprietary software for ProjectPilot.
