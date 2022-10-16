import * as Types from '../typebox';
import { ValueError } from '../errors/index';
import { Edit } from './delta';
export type { Edit } from './delta';
/** Value performs immutable operations on values */
export declare namespace Value {
    /** Casts a value into a given type. The return value will retain as much information of the original value as possible. Cast will convert string, number and boolean values if a reasonable conversion is possible. */
    function Cast<T extends Types.TSchema, R extends Types.TSchema[]>(schema: T, references: [...R], value: unknown): Types.Static<T>;
    /** Casts a value into a given type. The return value will retain as much information of the original value as possible. Cast will convert string, number and boolean values if a reasonable conversion is possible. */
    function Cast<T extends Types.TSchema>(schema: T, value: unknown): Types.Static<T>;
    /** Creates a value from the given type */
    function Create<T extends Types.TSchema, R extends Types.TSchema[]>(schema: T, references: [...R]): Types.Static<T>;
    /** Creates a value from the given type */
    function Create<T extends Types.TSchema>(schema: T): Types.Static<T>;
    /** Returns true if the value matches the given type. */
    function Check<T extends Types.TSchema, R extends Types.TSchema[]>(schema: T, references: [...R], value: unknown): value is Types.Static<T>;
    /** Returns true if the value matches the given type. */
    function Check<T extends Types.TSchema>(schema: T, value: unknown): value is Types.Static<T>;
    /** Returns an iterator for each error in this value. */
    function Errors<T extends Types.TSchema, R extends Types.TSchema[]>(schema: T, references: [...R], value: unknown): IterableIterator<ValueError>;
    /** Returns an iterator for each error in this value. */
    function Errors<T extends Types.TSchema>(schema: T, value: unknown): IterableIterator<ValueError>;
    /** Returns true if left and right values are structurally equal */
    function Equal<T>(left: T, right: unknown): right is T;
    /** Returns a structural clone of the given value */
    function Clone<T>(value: T): T;
    /** Returns edits to transform the current value into the next value */
    function Diff<T>(current: T, next: T): Edit<T>[];
    /** Returns a new value with edits applied to the given value */
    function Patch<T>(current: T, edits: Edit<T>[]): T;
}
