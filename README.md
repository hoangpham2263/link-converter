# Link Converter

Chuyển link sản phẩm Shopee thành link affiliate.

**Website:** https://hoangpham.is-a.dev/link-converter/

## Tính năng

- Nhận mọi dạng link Shopee: link sản phẩm, link rút gọn (`s.shopee.vn/…`, `shp.ee/…`), link đã gắn affiliate.
- Làm sạch link: gỡ link affiliate cũ, bỏ tham số theo dõi, giữ phân loại sản phẩm (`variant`, `extraParams`, `rModelId`).
- Nhiều tài khoản: mỗi tài khoản có trang đổi link riêng (`/link-converter/<ten-tai-khoan>`).
- Đổi nhiều link một lần, sao chép từng link hoặc tất cả.

## Cấu trúc

| File | Vai trò |
|---|---|
| `index.html`, `app.js`, `style.css` | Trang quản lý tài khoản và trang đổi link (chạy trên trình duyệt) |
| `shopee.js` | Đọc và làm sạch link Shopee |
| `accounts.json` | Danh sách tài khoản (tên → Affiliate ID) |
| `404.html` | Bản sao `index.html` để đường dẫn `/link-converter/<tên>` chạy trên GitHub Pages |
| `worker/` | Cloudflare Worker mở link rút gọn để lấy link sản phẩm |

## Triển khai

- Trang: GitHub Pages (nhánh `main`).
- Worker:

```bash
cd worker && npx wrangler deploy
```

## Công nghệ

HTML, CSS, JavaScript thuần · GitHub Pages · Cloudflare Workers
