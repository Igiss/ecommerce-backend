import { ProductDocument } from '../../database/schemas/product.schema';

/**
 * Tính giá hiện tại của sản phẩm dựa trên khoảng thời gian sale (nếu có).
 * @param product Document của sản phẩm
 * @returns Giá đang active (giá sale hoặc giá gốc)
 */
export function getActivePrice(product: Partial<ProductDocument>): number {
  const price = product.price || 0;
  
  if (product.salePrice == null) {
    return price;
  }

  const now = new Date();

  // Có giá sale nhưng không cài đặt ngày bắt đầu và ngày kết thúc -> Áp dụng sale vĩnh viễn
  if (!product.saleStartDate && !product.saleEndDate) {
    return product.salePrice;
  }

  // Nếu có cài ngày bắt đầu, kiểm tra xem đã đến lúc sale chưa
  if (product.saleStartDate && now < product.saleStartDate) {
    return price;
  }

  // Nếu có cài ngày kết thúc, kiểm tra xem đã qua lúc sale chưa
  if (product.saleEndDate && now > product.saleEndDate) {
    return price;
  }

  // Còn lại là trong hạn sale
  return product.salePrice;
}
