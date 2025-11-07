// src/models/Image.ts
import { isString, isNumber } from 'jet-validators';
import { parseObject, TParseOnError } from 'jet-validators/utils';
import { isRelationalKey, transIsDate } from '@src/common/util/validators';
import { IModel } from './common/types';

export interface IImage extends IModel {
  userId: number;
  title: string;
  originalFilename: string;
  filename: string;
  imagePath: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  tags?: string[];
}

const DEFAULT_IMAGE_VALS = (): IImage => ({
  id: -1,
  userId: -1,
  title: '',
  originalFilename: '',
  filename: '',
  imagePath: '',
  fileSize: 0,
  mimeType: '',
  created: new Date(),
});

const isOptionalString = (arg: unknown): arg is string | undefined => {
  return arg === undefined || isString(arg);
};

const isOptionalStringArray = (arg: unknown): arg is string[] | undefined => {
  return arg === undefined || (Array.isArray(arg) && arg.every(isString));
};

const parseImage = parseObject<IImage>({
  id: isRelationalKey,
  userId: isRelationalKey,
  title: isString,
  originalFilename: isString,
  filename: isString,
  imagePath: isString,
  fileSize: isNumber,
  mimeType: isString,
  created: transIsDate,
  description: isOptionalString,  // Ahora sí valida si existe
  tags: isOptionalStringArray,
});

function __new__(image?: Partial<IImage>): IImage {
  const retVal = { ...DEFAULT_IMAGE_VALS(), ...image };
  return parseImage(retVal, errors => {
    throw new Error('Setup new image failed ' + JSON.stringify(errors, null, 2));
  });
}

function test(arg: unknown, errCb?: TParseOnError): arg is IImage {
  return !!parseImage(arg, errCb);
}

export default {
  new: __new__,
  test,
} as const;