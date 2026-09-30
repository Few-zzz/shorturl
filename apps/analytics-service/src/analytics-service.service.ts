import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Click } from './click.schema';

@Injectable()
export class AnalyticsServiceService {
  constructor(
    @InjectModel(Click.name) private readonly clicks: Model<Click>,
  ) {}

  async record(code?: string, referrer?: string, userAgent?: string) {
    if (!code) {
      throw new BadRequestException('ต้องระบุ code');
    }
    await this.clicks.create({ code, referrer, userAgent });
    return { ok: true };
  }

  summary() {
    return this.clicks.aggregate([
      {
        $group: {
          _id: '$code',
          clicks: { $sum: 1 },
          lastClickedAt: { $max: '$clickedAt' },
        },
      },
      { $project: { _id: 0, code: '$_id', clicks: 1, lastClickedAt: 1 } },
      { $sort: { clicks: -1 } },
    ]);
  }

  async statsFor(code: string) {
    const [totalClicks, recent] = await Promise.all([
      this.clicks.countDocuments({ code }),
      this.clicks
        .find({ code })
        .sort({ clickedAt: -1 })
        .limit(20)
        .select('-_id referrer userAgent clickedAt')
        .lean(),
    ]);
    return { code, totalClicks, recent };
  }
}
