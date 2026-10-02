declare module "thai-address-database" {
  /** หนึ่งรายการที่อยู่ไทย — district = ตำบล/แขวง, amphoe = อำเภอ/เขต */
  export interface ThaiAddress {
    district: string;
    amphoe: string;
    province: string;
    zipcode: number;
  }
  /** query ถูกตีเป็น regex · maxResult ไม่ส่ง = 20 แถว */
  export function searchAddressByDistrict(query: string, maxResult?: number): ThaiAddress[];
  export function searchAddressByAmphoe(query: string, maxResult?: number): ThaiAddress[];
  export function searchAddressByProvince(query: string, maxResult?: number): ThaiAddress[];
  export function searchAddressByZipcode(query: string | number, maxResult?: number): ThaiAddress[];
  export function splitAddress(fullAddress: string): unknown;
}
