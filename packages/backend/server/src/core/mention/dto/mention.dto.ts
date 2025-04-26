import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class MentionResponseDto {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => Int)
  processedCount: number;
}