// 공통 타입 정의

export interface Product {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  imageUrl: string;
  images: string[];
  category: string;
  description: string;
  isSoldOut: boolean;
  options?: ProductOption[];
}

export interface ProductOption {
  name: string;
  values: string[];
  prices?: number[];
}

export interface CartItem {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  option?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  date: string;
  status: OrderStatus;
  totalPrice: number;
  items: OrderItem[];
  trackingNumber?: string;
  trackingUrl?: string;
}

export type OrderStatus =
  | 'pending'      // 주문 접수
  | 'confirmed'    // 결제 확인
  | 'preparing'    // 상품 준비
  | 'shipped'      // 출고 완료
  | 'delivering'   // 배송 중
  | 'delivered'    // 배송 완료
  | 'cancelled';   // 취소

export interface OrderItem {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  option?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isPartner: boolean;
  partnerGrade?: PartnerGrade;
}

export type PartnerGrade = 'BLOOM' | 'GARDEN' | 'ATELIER' | 'AMBASSADOR';

export interface PartnerDashboard {
  grade: PartnerGrade;
  discountRate: number;
  nextGrade?: PartnerGrade;
  progressToNext: number; // 0~100
  totalOrders: number;
  totalAmount: number;
  classes: PartnerClass[];
}

export interface PartnerClass {
  id: string;
  title: string;
  date: string;
  time: string;
  students: number;
  maxStudents: number;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface PushPreferences {
  orderStatus: boolean;
  restock: boolean;
  promotion: boolean;
  classReminder: boolean;
  partnerNotice: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
