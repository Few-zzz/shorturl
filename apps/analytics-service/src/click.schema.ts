import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  collection: 'clicks',
  versionKey: false,
  timestamps: { createdAt: 'clickedAt', updatedAt: false },
})
export class Click {
  @Prop({ type: String, required: true, index: true })
  code!: string;

  @Prop({ type: String })
  referrer?: string;

  @Prop({ type: String })
  userAgent?: string;

  clickedAt!: Date;
}

export const ClickSchema = SchemaFactory.createForClass(Click);
