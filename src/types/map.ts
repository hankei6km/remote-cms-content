export type BaseCols = {
  _RowNumber: number;
  id: string;
  createdAt: Date;
  updatedAt: Date;
} & Record<string, any>;

export type MapColsBase = {
  srcName: string;
  dstName: string;
};

export type MapColsId = {
  colType: 'id'; // colType は独自の定義(AppSheet 側の型ではない).
} & MapColsBase;

export type MapColsNumber = {
  colType: 'number';
} & MapColsBase;

export type MapColsString = {
  colType: 'string';
} & MapColsBase;

export type MapColsDatetime = {
  colType: 'datetime';
} & MapColsBase;

export type MapColsImage = {
  colType: 'image';
} & MapColsBase;

export type MapColsEnum = {
  colType: 'enum';
  replace: {
    pattern: string | RegExp;
    replacement: string;
  }[];
} & MapColsBase;

export type MapCols = (
  | MapColsId
  | MapColsNumber
  | MapColsString
  | MapColsDatetime
  | MapColsImage
  | MapColsEnum
)[];

export type MapConfig = {
  cols: MapCols;
};
