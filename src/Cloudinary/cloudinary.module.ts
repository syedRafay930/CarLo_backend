import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider';
import { uploadToCloudinary } from './cloudinary.helper';

@Module({
  providers: [CloudinaryProvider],
  exports: [CloudinaryProvider], // So other modules can use it
})
export class CloudinaryModule {}
