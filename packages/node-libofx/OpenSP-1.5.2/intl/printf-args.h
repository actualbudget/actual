/* Decomposed printf argument list.
   Copyright (C) 1999, 2002-2003 Free Software Foundation, Inc.

   This program is free software; you can redistribute it and/or modify it
   under the terms of the GNU Library General Public License as published
   by the Free Software Foundation; either version 2, or (at your option)
   any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
   Library General Public License for more details.

   You should have received a copy of the GNU Library General Public
   License along with this program; if not, write to the Free Software
   Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301,
   USA.  */

#ifndef _PRINTF_ARGS_H
#define _PRINTF_ARGS_H

/* Get size_t.  */
#include <stddef.h>

/* Get wchar_t.  */
#ifdef HAVE_WCHAR_T
# include <stddef.h>
#endif

/* Get wint_t.  */
#ifdef HAVE_WINT_T
# include <wchar.h>
#endif

/* Get va_list.  */
#include <stdarg.h>


/* Argument types */
typedef enum
{
  TYPE_NONE,
  TYPE_SCHAR,
  TYPE_UCHAR,
  TYPE_SHORT,
  TYPE_USHORT,
  TYPE_INT,
  TYPE_UINT,
  TYPE_LONGINT,
  TYPE_ULONGINT,
#ifdef HAVE_LONG_LONG
  TYPE_LONGLONGINT,
  TYPE_ULONGLONGINT,
#endif
  TYPE_DOUBLE,
#ifdef HAVE_LONG_DOUBLE
  TYPE_LONGDOUBLE,
#endif
  TYPE_CHAR,
#ifdef HAVE_WINT_T
  TYPE_WIDE_CHAR,
#endif
  TYPE_STRING,
#ifdef HAVE_WCHAR_T
  TYPE_WIDE_STRING,
#endif
  TYPE_POINTER,
  TYPE_COUNT_SCHAR_POINTER,
  TYPE_COUNT_SHORT_POINTER,
  TYPE_COUNT_INT_POINTER,
  TYPE_COUNT_LONGINT_POINTER
#ifdef HAVE_LONG_LONG
, TYPE_COUNT_LONGLONGINT_POINTER
#endif
} arg_type;

/* Polymorphic argument */
typedef struct
{
  arg_type type;
  union
  {
    signed char			a_schar;
    unsigned char		a_uchar;
    short			a_short;
    unsigned short		a_ushort;
    int				a_int;
    unsigned int		a_uint;
    long int			a_longint;
    unsigned long int		a_ulongint;
#ifdef HAVE_LONG_LONG
    long long int		a_longlongint;
    unsigned long long int	a_ulonglongint;
#endif
    float			a_float;
    double			a_double;
#ifdef HAVE_LONG_DOUBLE
    long double			a_longdouble;
#endif
    int				a_char;
#ifdef HAVE_WINT_T
    wint_t			a_wide_char;
#endif
    const char*			a_string;
#ifdef HAVE_WCHAR_T
    const wchar_t*		a_wide_string;
#endif
    void*			a_pointer;
    signed char *		a_count_schar_pointer;
    short *			a_count_short_pointer;
    int *			a_count_int_pointer;
    long int *			a_count_longint_pointer;
#ifdef HAVE_LONG_LONG
    long long int *		a_count_longlongint_pointer;
#endif
  }
  a;
}
argument;

typedef struct
{
  size_t count;
  argument *arg;
}
arguments;


/* Fetch the arguments, putting them into a. */
#ifdef STATIC
STATIC
#else
extern
#endif
int printf_fetchargs (va_list args, arguments *a);

#endif /* _PRINTF_ARGS_H */
