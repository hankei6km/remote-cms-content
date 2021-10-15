import { ISize } from 'image-size/dist/types/interface'

export type ImageSrc =
  | string
  | {
      url: string
      width: number
      height: number
    }
export type ImageInfo = {
  url: string // 基本的
  size: { width?: number; height?: number } | ISize
  meta: Record<string, any> //  定義のみ.
}
