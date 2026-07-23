declare module "thai-address-database" {
  /** หนึ่งรายการที่อยู่ไทย — district = ตำบล/แขวง, amphoe = อำเภอ/เขต */
  export interface ThaiAddress {
    district: string;
    amphoe: string;
    province: string;
    zipcode: number;
  }
  export function searchAddressByDistrict(query: string): ThaiAddress[];
  export function searchAddressByAmphoe(query: string): ThaiAddress[];
  export function searchAddressByProvince(query: string): ThaiAddress[];
  export function searchAddressByZipcode(query: string | number): ThaiAddress[];
  export function splitAddress(fullAddress: string): unknown;
}
