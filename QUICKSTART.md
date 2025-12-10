# Quick Start Guide / 快速開始指南

## 1. Run the Application / 運行應用

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## 2. Complete Registration / 完成註冊

### Step 1: Login Page / 登錄頁面
- Visit http://localhost:3000
- Click "New Supplier? Register Here" / 點擊"新供應商？點此註冊"

### Step 2: Fill Company Information / 填寫公司信息
Fill out the supplier registration form:

**Company Information / 公司信息:**
- Company Name / 公司名稱
- Business License Number / 營業執照號
- Year Established / 成立年份
- Registered Capital / 註冊資本
- Company Address / 公司地址
- Warehouse Address (optional) / 倉庫地址（可選）
- Upload business documents / 上傳營業文件

**Contact Information / 聯繫信息:**
- Contact Name / 聯繫人姓名
- Position / 職位
- Phone / 電話
- Email / 電郵

**Business Information / 業務信息:**
- Business Scope / 經營範圍
- Represented Brands / 代理品牌

### Step 3: Add Products / 添加產品 (重點)

This is the core feature! You can add as many products as you want:

1. Click "+ Add Product" button / 點擊"添加產品"按鈕
2. Fill in product details for each product:
   - SKU / SKU編碼
   - Product Name / 產品名稱
   - Category / 類別 (e.g., Furniture, Lighting)
   - Brand / 品牌
   - Material / 材質
   - Specification / 規格 (e.g., 120cm x 60cm x 75cm)
   - Unit Price (HKD) / 單價（港幣）
   - MOQ / 最小起訂量
   - Lead Time (days) / 交貨周期
   - Description / 產品描述
   - Product Image / 產品圖片
3. Click "Remove" to delete a product / 點擊"刪除"移除產品
4. Add more products by clicking "+ Add Product" again

### Step 4: Submit / 提交

1. Agree to terms / 同意條款
2. Click "Submit" / 點擊"提交"
3. You'll be redirected to the dashboard / 將被重定向到儀表板

## 3. Use the Dashboard / 使用儀表板

After registration, you'll see the dashboard with:

### Overview Section / 概覽區域
- Company information / 公司信息
- Total products count / 總產品數
- Number of categories / 類別數量
- Account status / 帳戶狀態

### Product Catalog / 產品目錄
- **Search products** by name, SKU, or brand / 搜索產品
- **Filter by category** / 按類別篩選
- View all products in a table / 在表格中查看所有產品
- See product details: SKU, name, category, brand, price, MOQ, lead time

### Actions / 操作
- **Edit Profile**: Update company info or add more products / 編輯檔案：更新公司信息或添加更多產品
- **Logout**: Sign out of the portal / 登出

## 4. Sample Data / 示例數據

Use this sample data for quick testing:

### Company Information
```
Company Name: Premium Furniture Co., Ltd.
Business License: BL2024001234
Year Established: 2015
Registered Capital: HKD 2,000,000
Company Address: Room 1501, Building A, 123 Nathan Road, Kowloon, Hong Kong
Business Scope: Furniture, Home Decor, Building Materials, Lighting
Represented Brands: ModernLine, ClassicHome, UrbanStyle
```

### Contact Information
```
Contact Name: John Chan
Position: Sales Manager
Phone: +852 9123 4567
Email: john.chan@premiumfurniture.com
```

### Sample Products

**Product 1:**
```
SKU: PF-SOFA-001
Name: Modern Fabric Sofa
Category: Furniture
Brand: ModernLine
Material: Premium Fabric, Solid Wood Frame
Spec: 200cm x 90cm x 85cm
Unit Price: 5800
MOQ: 10
Lead Time: 14
Description: Contemporary design sofa with high-density foam cushions and removable fabric covers. Perfect for modern living spaces.
```

**Product 2:**
```
SKU: PF-TABLE-002
Name: Wooden Dining Table
Category: Furniture
Brand: ClassicHome
Material: Solid Oak Wood
Spec: 180cm x 90cm x 75cm
Unit Price: 4200
MOQ: 5
Lead Time: 21
Description: Handcrafted dining table made from premium oak wood with a natural finish.
```

**Product 3:**
```
SKU: PF-LAMP-003
Name: LED Floor Lamp
Category: Lighting
Brand: UrbanStyle
Material: Aluminum, Acrylic
Spec: Height 160cm, Base 30cm diameter
Unit Price: 980
MOQ: 20
Lead Time: 7
Description: Modern LED floor lamp with adjustable brightness and color temperature. Energy-efficient and long-lasting.
```

## 5. Key Features to Test / 主要功能測試

### Auto-Save / 自動保存
1. Start filling the registration form
2. Wait a few seconds
3. Refresh the page
4. Your data will be restored! / 您的數據將被恢復！

### Product Management / 產品管理
1. Add 3-5 products during registration
2. Submit the form
3. In dashboard, try searching for a product by name
4. Try filtering by category
5. Click "Edit Profile" to add more products

### Search and Filter / 搜索和篩選
1. Go to dashboard
2. Use the search box to find products by name, SKU, or brand
3. Use the category dropdown to filter products
4. See the product count update

## 6. Tips / 提示

- **Auto-save runs every second** - no need to manually save drafts / 自動保存每秒運行一次
- **Add products during registration or later** - both work! / 註冊時或之後添加產品都可以
- **Files are simulated** - in frontend mode, file uploads are tracked but not actually uploaded / 文件是模擬的
- **Clear localStorage to reset** - use browser developer tools to clear all data / 清除localStorage以重置

## 7. Common Tasks / 常見任務

### Add more products after registration
1. Login to dashboard
2. Click "Edit Profile" button
3. Scroll to "Product Catalog" section
4. Click "+ Add Product"
5. Fill in details and submit

### Update company information
1. Click "Edit Profile" in dashboard
2. Update any company or contact information
3. Click "Submit" to save changes

### View product details
- All products are displayed in the dashboard table
- Use search and filter to find specific products quickly

## Need Help? / 需要幫助？

- Check the README.md for detailed documentation
- All data is stored in browser localStorage
- Clear browser cache if you encounter issues
