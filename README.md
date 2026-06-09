# Ecommerce Backend

Backend website thương mại điện tử dùng NestJS, MongoDB, Mongoose, JWT, bcrypt,
ConfigModule, DTO validation và Swagger.

## Cài đặt

```bash
npm install
```

Tạo file `.env` từ `.env.example`:

```env
PORT=3000
MONGO_URI=mongodb:
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
```

## Chạy project

```bash
npm run start:dev
```

API prefix: `http://localhost:3000/api`

Swagger docs: `http://localhost:3000/api/docs`

## Cấu trúc đã tạo

```text
src/
├── auth/
│   ├── dto/
│   ├── guards/
│   ├── interfaces/
│   ├── strategies/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── products/
├── categories/
├── cart/
├── orders/
├── payments/
├── reviews/
├── upload/
├── notifications/
├── reports/
├── common/
├── database/
│   ├── schemas/
│   │   ├── cart.schema.ts
│   │   ├── category.schema.ts
│   │   ├── custom-design.schema.ts
│   │   ├── notification.schema.ts
│   │   ├── order.schema.ts
│   │   ├── payment.schema.ts
│   │   ├── product.schema.ts
│   │   ├── report.schema.ts
│   │   ├── review.schema.ts
│   │   ├── upload.schema.ts
│   │   └── user.schema.ts
│   └── database.module.ts
├── app.module.ts
└── main.ts
```

## Endpoint Postman hiện có

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile` - Bearer token
- `PATCH /api/auth/change-password` - Bearer token

Users:

- `GET /api/users` - admin
- `GET /api/users/:id` - admin
- `PATCH /api/users/profile` - user cập nhật profile của chính mình
- `PATCH /api/users/:id/status` - admin
- `PATCH /api/users/:id/role` - admin

Categories:

- `POST /api/categories` - admin/owner
- `GET /api/categories`
- `GET /api/categories/:id`
- `PATCH /api/categories/:id` - admin/owner
- `DELETE /api/categories/:id` - admin/owner, chuyển `status` sang `inactive`

Products:

- `POST /api/products` - admin/owner
- `GET /api/products`
- `GET /api/products/:id`
- `PATCH /api/products/:id` - admin/owner
- `DELETE /api/products/:id` - admin/owner, soft delete bằng `status=deleted`

Query sản phẩm hỗ trợ:

- `page`, `limit`
- `search`
- `categoryId`
- `minPrice`, `maxPrice`
- `brand`
- `status`
- `sortBy=price|createdAt`
- `sortOrder=asc|desc`

Cart:

- `GET /api/cart` - user
- `POST /api/cart/items` - user
- `PATCH /api/cart/items/:productId` - user
- `DELETE /api/cart/items/:productId` - user
- `DELETE /api/cart` - user

Orders:

- `POST /api/orders` - user
- `GET /api/orders/me` - user
- `GET /api/orders` - admin/owner
- `GET /api/orders/:id` - owner/admin
- `PATCH /api/orders/:id/status` - admin/owner
- `PATCH /api/orders/:id/cancel` - owner, chỉ đơn `pending`

Payments:

- `POST /api/payments` - user, mock COD/BANKING/MOMO
- `GET /api/payments/me` - user
- `GET /api/payments` - admin/owner
- `PATCH /api/payments/:id/status` - admin/owner

Reviews:

- `POST /api/reviews` - user
- `GET /api/reviews/product/:productId`
- `PATCH /api/reviews/:id` - owner
- `DELETE /api/reviews/:id` - owner/admin

Custom Designs:

- `POST /api/custom-designs` - user
- `GET /api/custom-designs/me` - user
- `GET /api/custom-designs` - admin/owner
- `GET /api/custom-designs/:id` - owner/admin
- `PATCH /api/custom-designs/:id/status` - admin/owner

Upload:

- `POST /api/upload/product-image` - multipart `file`
- `POST /api/upload/avatar` - multipart `file`
- `POST /api/upload/custom-design` - multipart `file`

Notifications:

- `POST /api/notifications` - admin/owner
- `GET /api/notifications/me` - user
- `PATCH /api/notifications/:id/read` - owner
- `PATCH /api/notifications/read-all` - user

Reports:

- `GET /api/reports/overview` - admin

## Role

- `admin`: toàn quyền
- `owner`: quản lý sản phẩm, đơn hàng, tồn kho
- `user`: xem sản phẩm, giỏ hàng, đặt hàng, đánh giá

## Thiết kế Database MongoDB

Quy ước chung:

- Tất cả collection dùng `timestamps: true`, tự có `createdAt`, `updatedAt`.
- Ref dùng `Types.ObjectId`.
- Soft delete dùng `status` thay vì xóa cứng ở các collection nghiệp vụ chính.

### users

Fields:

- `fullName`: String, required
- `email`: String, required, unique, lowercase
- `password`: String, required, `select: false`
- `phone`: String, optional
- `avatar`: String, optional, ref URL upload
- `role`: String, required, default `user`, enum `admin|owner|user`
- `status`: String, required, default `active`, enum `active|blocked`
- `address`: String, optional, default `''`

Indexes:

- `{ email: 1 } unique`
- `{ role: 1 }`
- `{ status: 1 }`

### categories

Fields:

- `name`: String, required
- `slug`: String, required, unique
- `description`: String, optional, default `''`
- `status`: String, required, default `active`, enum `active|inactive`

Indexes:

- `{ slug: 1 } unique`
- `{ status: 1 }`

### products

Fields:

- `name`: String, required
- `slug`: String, required, unique
- `description`: String, optional, default `''`
- `productType`: String, required, default `standard`, enum `standard|cup|household|3d_print|custom`
- `price`: Number, required, min `0`
- `salePrice`: Number, optional, min `0`
- `stock`: Number, required, default `0`, min `0`
- `categoryId`: ObjectId, required, ref `Category`
- `images`: String[], optional, default `[]`
- `brand`: String, optional
- `material`: String, optional
- `color`: String[], optional, default `[]`
- `size`: String[], optional, default `[]`
- `dimensions`: Object, optional, default `{}`, fields `length|width|height|unit`
- `weight`: Number, optional, min `0`
- `isCustomizable`: Boolean, required, default `false`
- `customOptions`: Object, optional, default `{}`, fields `allowedColors|allowedSizes|allowedMaterials|allowText|allowImageUpload|allowModelUpload|extraPrice`
- `status`: String, required, default `active`, enum `active|inactive|deleted`
- `createdBy`: ObjectId, required, ref `User`

Indexes:

- `{ slug: 1 } unique`
- `{ name: 'text', description: 'text', brand: 'text' }`
- `{ productType: 1 }`
- `{ categoryId: 1 }`
- `{ status: 1 }`
- `{ price: 1 }`
- `{ createdBy: 1 }`

### carts

Fields:

- `userId`: ObjectId, required, ref `User`
- `items`: Array, required, default `[]`
- `items.productId`: ObjectId, required, ref `Product`
- `items.customDesignId`: ObjectId, optional, ref `CustomDesign`
- `items.quantity`: Number, required, default `1`, min `1`
- `items.price`: Number, required, min `0`
- `items.productName`: String, optional snapshot
- `items.image`: String, optional snapshot

Indexes:

- `{ userId: 1 } unique`
- `{ 'items.productId': 1 }`

### orders

Fields:

- `userId`: ObjectId, required, ref `User`
- `items`: Array, required
- `items.productId`: ObjectId, optional, ref `Product`
- `items.customDesignId`: ObjectId, optional, ref `CustomDesign`
- `items.productName`: String, required snapshot
- `items.productType`: String, required, enum `standard|cup|household|3d_print|custom`
- `items.quantity`: Number, required, min `1`
- `items.price`: Number, required, min `0`
- `items.total`: Number, required, min `0`
- `totalAmount`: Number, required, min `0`
- `shippingAddress`: Object, required, fields `fullName|phone|address|ward|district|city`
- `paymentMethod`: String, required, enum `COD|BANKING|MOMO`
- `paymentStatus`: String, required, default `unpaid`, enum `unpaid|paid|failed|refunded`
- `orderStatus`: String, required, default `pending`, enum `pending|confirmed|shipping|completed|cancelled`
- `note`: String, optional, default `''`
- `cancelReason`: String, optional

Indexes:

- `{ userId: 1 }`
- `{ orderStatus: 1 }`
- `{ paymentStatus: 1 }`
- `{ createdAt: -1 }`

### payments

Fields:

- `orderId`: ObjectId, required, ref `Order`
- `userId`: ObjectId, required, ref `User`
- `method`: String, required, enum `COD|BANKING|MOMO`
- `amount`: Number, required, min `0`
- `status`: String, required, default `unpaid`, enum `unpaid|paid|failed|refunded`
- `transactionCode`: String, optional
- `paidAt`: Date, optional
- `metadata`: Object, optional, default `{}`

Indexes:

- `{ orderId: 1 }`
- `{ userId: 1 }`
- `{ status: 1 }`
- `{ transactionCode: 1 } sparse`

### reviews

Fields:

- `userId`: ObjectId, required, ref `User`
- `productId`: ObjectId, required, ref `Product`
- `orderId`: ObjectId, required, ref `Order`
- `rating`: Number, required, min `1`, max `5`
- `comment`: String, optional, default `''`
- `status`: String, required, default `visible`, enum `visible|hidden|deleted`

Indexes:

- `{ productId: 1 }`
- `{ userId: 1 }`
- `{ orderId: 1 }`
- `{ userId: 1, productId: 1, orderId: 1 } unique`

### custom_designs

Fields:

- `userId`: ObjectId, required, ref `User`
- `productId`: ObjectId, optional, ref `Product`
- `designName`: String, required
- `note`: String, optional, default `''`
- `textContent`: String, optional, default `''`
- `uploadedFiles`: ObjectId[], optional, default `[]`, ref `Upload`
- `selectedColor`: String, optional
- `selectedSize`: String, optional
- `material`: String, optional
- `estimatedPrice`: Number, required, default `0`, min `0`
- `status`: String, required, default `submitted`, enum `draft|submitted|reviewing|quoted|approved|rejected|in_production|completed|cancelled`
- `adminNote`: String, optional, default `''`

Indexes:

- `{ userId: 1 }`
- `{ productId: 1 }`
- `{ status: 1 }`
- `{ createdAt: -1 }`

### uploads

Fields:

- `userId`: ObjectId, required, ref `User`
- `originalName`: String, required
- `fileName`: String, required
- `mimeType`: String, required
- `size`: Number, required
- `url`: String, required
- `type`: String, required, enum `product_image|avatar|custom_design|review_image`
- `status`: String, required, default `active`, enum `active|deleted`

Indexes:

- `{ userId: 1 }`
- `{ type: 1 }`
- `{ status: 1 }`

### notifications

Fields:

- `userId`: ObjectId, required, ref `User`
- `title`: String, required
- `message`: String, required
- `type`: String, required, enum `order|payment|custom_design|system`
- `isRead`: Boolean, required, default `false`
- `metadata`: Object, optional, default `{}`

Indexes:

- `{ userId: 1 }`
- `{ isRead: 1 }`
- `{ createdAt: -1 }`

### reports

Reports có thể tính realtime bằng aggregate. Nếu cần lưu snapshot:

Fields:

- `type`: String, required, enum `daily|monthly|custom`
- `fromDate`: Date, required
- `toDate`: Date, required
- `totalUsers`: Number, required, default `0`
- `totalProducts`: Number, required, default `0`
- `totalOrders`: Number, required, default `0`
- `totalRevenue`: Number, required, default `0`
- `bestSellingProducts`: Array, optional, default `[]`
- `createdBy`: ObjectId, optional, ref `User`

Indexes:

- `{ type: 1 }`
- `{ fromDate: 1, toDate: 1 }`

Các module products, categories, cart, orders, payments, reviews, upload,
notifications và reports đã có thư mục nền để triển khai ở các bước tiếp theo.
