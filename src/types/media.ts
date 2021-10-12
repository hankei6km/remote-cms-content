import { ISize } from 'image-size/dist/types/interface'
export type ImageInfo = {
  url: string // 基本的
  size: {} | ISize
  meta: Record<string, any> //  定義のみ.
}
