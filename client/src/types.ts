export interface Product {
  id: string;
  name: string;
  description: string;
  price_usd: number;
  category: string;
  file_name: string;
  pages: number;
  rating: number;
  reviews: number;
  created_at: string;
}

export interface Order {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  buyer_address: string;
  amount_usdc: number;
  status: string;
  download_token: string;
  tx_id?: string;
  created_at: string;
}

export interface PurchaseResult {
  success: boolean;
  orderId: string;
  productName: string;
  amountPaid: string;
  txId?: string;
  downloadToken: string;
  downloadUrl: string;
  message: string;
}
