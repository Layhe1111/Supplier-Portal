# ProjectPilot Supplier Portal

供應商註冊與產品管理門戶

A minimalist supplier registration and product management portal built with Next.js.

## Features / 功能特點

### Supplier Management / 供應商管理
- Simple registration process / 簡單的註冊流程
- Company information management / 公司信息管理
- Business scope and brand representation / 經營範圍和品牌代理
- Document upload support / 文件上傳支持

### Product Management / 產品管理 (核心功能)
- **Add unlimited products** / 添加無限產品
- Comprehensive product details:
  - SKU, name, category, brand / SKU、名稱、類別、品牌
  - Specifications and materials / 規格和材質
  - Pricing and MOQ / 價格和最小起訂量
  - Lead time / 交貨周期
  - Product descriptions / 產品描述
  - Image upload / 圖片上傳

### Dashboard Features / 儀表板功能
- Product catalog overview / 產品目錄概覽
- **Search and filter products** / 搜索和篩選產品
- Category-based filtering / 基於類別的篩選
- Product statistics / 產品統計
- Quick access to add/edit products / 快速添加/編輯產品

### Smart Features / 智能功能
- **Auto-save drafts** (every 1 second) / 自動保存草稿（每秒）
- Form validation / 表單驗證
- Bilingual interface (English/Traditional Chinese) / 雙語界面
- Responsive design / 響應式設計
- Minimalist UI / 極簡界面

## Technology Stack / 技術棧

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Storage**: localStorage (frontend-only)

## Getting Started / 快速開始

### Installation / 安裝

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
http://localhost:3000
```

### Build for Production / 生產構建

```bash
npm run build
npm start
```

## Project Structure / 項目結構

```
├── app/
│   ├── page.tsx                    # Login page / 登錄頁面
│   ├── register/
│   │   └── supplier/page.tsx       # Supplier registration / 供應商註冊
│   ├── dashboard/page.tsx          # Dashboard with product management / 儀表板
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Global styles
├── components/
│   ├── FormInput.tsx               # Text input component
│   ├── FormCheckbox.tsx            # Checkbox component
│   ├── FileUpload.tsx              # File upload component
│   └── FormSection.tsx             # Form section wrapper
└── public/                         # Static assets
```

## User Flow / 使用流程

1. **Login** / 登錄
   - Enter email and password
   - Click "Register" if new supplier

2. **Registration** / 註冊
   - Fill company information / 填寫公司信息
   - Add contact details / 添加聯繫方式
   - Upload business documents / 上傳營業文件
   - **Add products** (can add multiple) / 添加產品（可添加多個）
   - Submit registration / 提交註冊

3. **Dashboard** / 儀表板
   - View all products / 查看所有產品
   - Search and filter / 搜索和篩選
   - Add more products / 添加更多產品
   - Edit profile / 編輯檔案

## Key Features in Detail / 功能詳解

### Product Management / 產品管理

The product management system is the core feature:

**During Registration:**
- Add products directly during the registration process
- Each product includes comprehensive details
- Support for product images
- Can add multiple products at once

**In Dashboard:**
- View all products in a clean table format
- Search by SKU, product name, or brand
- Filter by category
- See product statistics (total products, categories)
- Quick access to add more products

### Auto-Save / 自動保存

Forms automatically save to localStorage every second:
- Prevents data loss
- Resume where you left off
- Works across browser refreshes

### File Upload / 文件上傳

Supported file uploads:
- Business registration documents (PDF, JPG, PNG)
- Company photos
- Product images

## Sample Data for Testing / 測試數據

```
Company Information:
- Company Name: Premium Furniture Co.
- Business License: BL123456789
- Year Established: 2015
- Registered Capital: HKD 2,000,000
- Business Scope: Furniture, Home Decor, Building Materials

Contact Information:
- Contact Name: John Chan
- Position: Sales Manager
- Phone: +852 1234 5678
- Email: john@premiumfurniture.com

Sample Product:
- SKU: PF-SOFA-001
- Name: Modern Sofa
- Category: Furniture
- Brand: PremiumLine
- Material: Fabric, Wood
- Spec: 200cm x 90cm x 85cm
- Unit Price: 5800
- MOQ: 10
- Lead Time: 14
```

## Future Enhancements / 未來增強功能

When adding backend:
- API integration for data persistence
- Database storage (PostgreSQL/MongoDB)
- Real file upload to cloud storage (AWS S3/Cloudinary)
- User authentication with JWT
- Admin panel for supplier approval
- Product inventory tracking
- Order management system
- Advanced search with filters
- Export product catalog (CSV/Excel)
- Multi-language support expansion

## Notes / 注意事項

- Currently using localStorage (browser storage)
- Clear browser cache to reset data
- File uploads are simulated in frontend-only mode
- All data is stored locally in the browser

## License

This project is proprietary software for ProjectPilot.
