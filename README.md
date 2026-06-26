# Xe Máy Tâm An Nomura

Website showroom xe máy mới/cũ, tối ưu mobile, có khu vực quản trị sản phẩm. Dự án chạy trên **Cloudflare Workers Static Assets + D1 + R2** và có sẵn workflow deploy từ GitHub.

## Có gì trong bản này?

- Trang giới thiệu showroom tông đỏ, hiệu ứng scroll/hover nhẹ và responsive.
- Kho xe lọc theo: có sẵn, sắp về, xe mới, xe cũ.
- Trang quản trị tại `/admin`:
  - Đăng nhập bằng mật khẩu bí mật.
  - Thêm/sửa xe, giá, loại xe, mô tả, thứ tự hiển thị.
  - Đổi trạng thái: **Còn hàng / Sắp về / Đang giữ xe / Đã bán**.
  - Đăng nhiều ảnh xe vào Cloudflare R2.
- API cùng domain, không cần server/VPS riêng.
- Có sẵn 3 xe mẫu trong migration để kiểm tra giao diện.

## Chuẩn bị

Cài Node.js 20+ và đăng nhập Cloudflare:

```bash
npm install
npx wrangler login
```

Tạo D1 database:

```bash
npx wrangler d1 create tam-an-db
```

Lệnh sẽ trả về `database_id`. Mở `wrangler.jsonc`, thay dòng:

```json
"database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

bằng ID thật vừa nhận.

Tạo R2 bucket:

```bash
npx wrangler r2 bucket create tam-an-images
```

Tạo mật khẩu quản trị và khoá ký session (không đưa hai giá trị này lên GitHub):

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
```

`SESSION_SECRET` nên là một chuỗi ngẫu nhiên dài, ví dụ tạo nhanh bằng:

```bash
node -e "console.log(crypto.randomUUID() + crypto.randomUUID())"
```

## Khởi tạo database và chạy local

```bash
npx wrangler d1 migrations apply tam-an-db --local
npm run dev
```

Khi muốn test upload ảnh bằng R2 local, chạy `npm run dev` rồi dùng trang `/admin`. Với D1 production, chạy migration remote:

```bash
npx wrangler d1 migrations apply tam-an-db --remote
```

## Deploy lên Cloudflare

```bash
npm run deploy
```

Sau khi deploy, mở đường dẫn `*.workers.dev` do Cloudflare trả về. Trang quản trị là:

```text
https://TEN-WORKER.workers.dev/admin
```

## Deploy tự động từ GitHub

1. Tạo repository GitHub rồi đẩy toàn bộ source code này lên nhánh `main`.
2. Trong Cloudflare, tạo API Token có quyền deploy Workers.
3. Vào GitHub repository → **Settings → Secrets and variables → Actions**.
4. Tạo hai secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
5. Mỗi lần push lên `main`, workflow `.github/workflows/deploy.yml` sẽ deploy lại website.

## Thay đổi thông tin cửa hàng

Các nội dung hotline, địa chỉ và link Zalo đang nằm ở:

```text
public/index.html
```

Tìm các giá trị:

```text
0856 262 886
Cổng phụ KCN Nomura, Hải Phòng
https://zalo.me/0856262886
```

## Lưu ý ảnh

- Ảnh có dung lượng tối đa 8MB/ảnh.
- Hệ thống lưu ảnh mới trong R2 và trả URL dạng `/media/...`.
- Ảnh nhận từ người dùng trong cuộc trò chuyện đã được dùng làm hình showroom và minh hoạ Vision ở `public/assets/`.

## Cấu trúc chính

```text
public/              Giao diện và hình ảnh
worker/index.js      API, xác thực admin, D1 và R2
migrations/          Schema + dữ liệu xe mẫu
wrangler.jsonc       Cấu hình Cloudflare
.github/workflows/   Deploy tự động từ GitHub
```
