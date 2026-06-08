import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import { type ZodSchema } from "zod";

/**
 * Pipe that validates a value against a Zod schema.
 * Throws BadRequestException with the Zod error details on failure.
 *
 * Usage: @Body(new ZodValidationPipe(mySchema)) dto: MyType
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.errors);
    }
    return result.data;
  }
}
