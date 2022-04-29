dnl OJ_CHECK_SIZEOF(TYPE, HEADER [, CROSS-SIZE])
AC_DEFUN([OJ_CHECK_SIZEOF],
[changequote(<<, >>)dnl
dnl The name to #define.
define(<<AC_TYPE_NAME>>, translit(sizeof_$1, [a-z *], [A-Z_P]))dnl
dnl The cache variable name.
define(<<AC_CV_NAME>>, translit(ac_cv_sizeof_$1, [ *], [_p]))dnl
changequote([, ])dnl
AC_MSG_CHECKING(size of $1)
AC_CACHE_VAL(AC_CV_NAME,
[AC_TRY_RUN([#include <stdio.h>
#include <$2>
main()
{
  FILE *f=fopen("conftestval", "w");
  if (!f) exit(1);
  fprintf(f, "%d\n", sizeof($1));
  exit(0);
}], AC_CV_NAME=`cat conftestval`, AC_CV_NAME=0, ifelse([$3] , , AC_CV_NAME=$3))])dnl
AC_MSG_RESULT($AC_CV_NAME)
AC_DEFINE_UNQUOTED(AC_TYPE_NAME, $AC_CV_NAME)
undefine([AC_TYPE_NAME])dnl
undefine([AC_CV_NAME])dnl
])


dnl @synopsis AC_CXX_PLACEMENT_OPERATOR_DELETE
dnl
dnl If the compiler supports void delete(size_t,void*), define
dnl HAVE_PLACEMENT_OPERATOR_DELETE.
dnl
dnl @author Matthias Clasen
dnl
AC_DEFUN([AC_CXX_PLACEMENT_OPERATOR_DELETE],
[AC_CACHE_CHECK(whether the compiler supports placement operator delete,
ac_cv_cxx_placement_operator_delete,
[AC_LANG_SAVE
 AC_LANG_CPLUSPLUS
 AC_TRY_COMPILE([#include <stddef.h>],
  [class Thing {
   public:
    Thing() { };
    void *operator new(size_t,bool) { };
    void operator delete(size_t,void*) { };
   };],
   ac_cv_cxx_placement_operator_delete=yes, 
   ac_cv_cxx_placement_operator_delete=no)
 AC_LANG_RESTORE
])
if test "$ac_cv_cxx_placement_operator_delete" = yes; then
  AC_DEFINE(HAVE_PLACEMENT_OPERATOR_DELETE,,
            [define if the compiler supports placement operator delete])
fi
])


dnl @synopsis AC_CXX_BOOL
dnl
dnl If the compiler recognizes bool as a separate built-in type,
dnl define HAVE_BOOL. Note that a typedef is not a separate
dnl type since you cannot overload a function such that it accepts either
dnl the basic type or the typedef.
dnl
dnl @version $Id: acinclude.m4,v 1.9.2.1 2004/06/30 13:16:25 keichwa Exp $
dnl @author Luc Maisonobe
dnl
AC_DEFUN([AC_CXX_BOOL],
[AC_CACHE_CHECK(whether the compiler recognizes bool as a built-in type,
ac_cv_cxx_bool,
[AC_LANG_SAVE
 AC_LANG_CPLUSPLUS
 AC_TRY_COMPILE([
int f(int  x){return 1;}
int f(char x){return 1;}
int f(bool x){return 1;}
],[bool b = true; return f(b);],
 ac_cv_cxx_bool=yes, ac_cv_cxx_bool=no)
 AC_LANG_RESTORE
])
if test "$ac_cv_cxx_bool" = yes; then
  AC_DEFINE(HAVE_BOOL,,[define if bool is a built-in type])
fi
])

dnl @synopsis AC_CXX_TYPENAME
dnl
dnl If the compiler recognizes the typename keyword, define HAVE_TYPENAME.
dnl
dnl @version $Id: acinclude.m4,v 1.9.2.1 2004/06/30 13:16:25 keichwa Exp $
dnl @author Luc Maisonobe
dnl
AC_DEFUN([AC_CXX_TYPENAME],
[AC_CACHE_CHECK(whether the compiler recognizes typename,
ac_cv_cxx_typename,
[AC_LANG_SAVE
 AC_LANG_CPLUSPLUS
 AC_TRY_COMPILE([template<typename T>class X {public:X(){}};],
[X<float> z; return 0;],
 ac_cv_cxx_typename=yes, ac_cv_cxx_typename=no)
 AC_LANG_RESTORE
])
if test "$ac_cv_cxx_typename" = yes; then
  AC_DEFINE(HAVE_TYPENAME,,[define if the compiler recognizes typename])
fi
])

dnl @synopsis AC_CXX_NEW_FOR_SCOPING
dnl
dnl If the compiler accepts the new for scoping rules (the scope of a
dnl variable declared inside the parentheses is restricted to the
dnl for-body), define HAVE_NEW_FOR_SCOPING.
dnl
dnl @version $Id: acinclude.m4,v 1.9.2.1 2004/06/30 13:16:25 keichwa Exp $
dnl @author Luc Maisonobe
dnl
AC_DEFUN([AC_CXX_NEW_FOR_SCOPING],
[AC_CACHE_CHECK(whether the compiler accepts the new for scoping rules,
ac_cv_cxx_new_for_scoping,
[AC_LANG_SAVE
 AC_LANG_CPLUSPLUS
 AC_TRY_COMPILE(,[
  int z = 0;
  for (int i = 0; i < 10; ++i)
    z = z + i;
  for (int i = 0; i < 10; ++i)
    z = z - i;
  return z;],
 ac_cv_cxx_new_for_scoping=yes, ac_cv_cxx_new_for_scoping=no)
 AC_LANG_RESTORE
])
if test "$ac_cv_cxx_new_for_scoping" = yes; then
  AC_DEFINE(HAVE_NEW_FOR_SCOPING,,[define if the compiler accepts the new for scoping rules])
fi
])


dnl @synopsis AC_CXX_DYNAMIC_CAST
dnl
dnl If the compiler supports dynamic_cast<>, define HAVE_DYNAMIC_CAST.
dnl
dnl @version $Id: acinclude.m4,v 1.9.2.1 2004/06/30 13:16:25 keichwa Exp $
dnl @author Luc Maisonobe
dnl
AC_DEFUN([AC_CXX_DYNAMIC_CAST],
[AC_CACHE_CHECK(whether the compiler supports dynamic_cast<>,
ac_cv_cxx_dynamic_cast,
[AC_LANG_SAVE
 AC_LANG_CPLUSPLUS
 AC_TRY_COMPILE([#include <typeinfo>
class Base { public : Base () {} virtual void f () = 0;};
class Derived : public Base { public : Derived () {} virtual void f () {} };],[
Derived d; Base& b=d; return dynamic_cast<Derived*>(&b) ? 0 : 1;],
 ac_cv_cxx_dynamic_cast=yes, ac_cv_cxx_dynamic_cast=no)
 AC_LANG_RESTORE
])
if test "$ac_cv_cxx_dynamic_cast" = yes; then
  AC_DEFINE(HAVE_DYNAMIC_CAST,,[define if the compiler supports dynamic_cast<>])
fi
])


dnl @synopsis AC_CXX_NAMESPACES
dnl
dnl If the compiler can prevent names clashes using namespaces, define
dnl HAVE_NAMESPACES.
dnl
dnl @version $Id: acinclude.m4,v 1.9.2.1 2004/06/30 13:16:25 keichwa Exp $
dnl @author Luc Maisonobe
dnl
AC_DEFUN([AC_CXX_NAMESPACES],
[AC_CACHE_CHECK(whether the compiler implements namespaces,
ac_cv_cxx_namespaces,
[AC_LANG_SAVE
 AC_LANG_CPLUSPLUS
 AC_TRY_COMPILE([namespace Outer { namespace Inner { int i = 0; }}],
                [using namespace Outer::Inner; return i;],
 ac_cv_cxx_namespaces=yes, ac_cv_cxx_namespaces=no)
 AC_LANG_RESTORE
])
if test "$ac_cv_cxx_namespaces" = yes; then
  AC_DEFINE(HAVE_NAMESPACES,,[define if the compiler implements namespaces])
fi
])


dnl @synopsis ACX_CHECK_PATHNAME_STYLE_DOS
dnl
dnl Check if host OS uses DOS-style pathnames. This includes the use
dnl of drive letters and backslashes. Under DOS, Windows, and OS/2,
dnl defines HAVE_PATHNAME_STYLE_DOS and PATH_SEPARATOR to ';'.
dnl Otherwise, defines PATH_SEPARATOR to ':'.
dnl
dnl Use for enabling code to handle drive letters, backslashes in
dnl filenames and semicolons in the PATH.
dnl
dnl @version $Id: acinclude.m4,v 1.9.2.1 2004/06/30 13:16:25 keichwa Exp $
dnl @author Mark Elbrecht <snowball3@bigfoot.com>
dnl
AC_DEFUN([ACX_CHECK_PATHNAME_STYLE_DOS],
[AC_MSG_CHECKING(for Windows and DOS and OS/2 style pathnames)
AC_CACHE_VAL(acx_cv_pathname_style_dos,
[AC_REQUIRE([AC_CANONICAL_HOST])

acx_cv_pathname_style_dos="no"
case ${host_os} in
  *djgpp | *mingw32 | *emx*) acx_cv_pathname_style_dos="yes" ;;
esac
])
AC_MSG_RESULT($acx_cv_pathname_style_dos)
if test $acx_cv_pathname_style_dos = "yes"; then
  AC_DEFINE(HAVE_PATHNAME_STYLE_DOS)
  AC_DEFINE(PATH_SEPARATOR, ';')
else
  AC_DEFINE(PATH_SEPARATOR, ':')
fi
])


dnl @synopsis AC_CXX_EXPLICIT_INSTANTIATIONS
dnl
dnl If the C++ compiler supports explicit instanciations syntax,
dnl define HAVE_INSTANTIATIONS.
dnl
dnl @version $Id: acinclude.m4,v 1.9.2.1 2004/06/30 13:16:25 keichwa Exp $
dnl @author Luc Maisonobe
dnl
AC_DEFUN([AC_CXX_EXPLICIT_INSTANTIATIONS],
[AC_CACHE_CHECK(whether the compiler supports explicit instantiations,
ac_cv_cxx_explinst,
[AC_LANG_SAVE
 AC_LANG_CPLUSPLUS
 AC_TRY_COMPILE([template <class T> class A { T t; }; template class A<int>;],
 [], ac_cv_cxx_explinst=yes, ac_cv_cxx_explinst=no)
 AC_LANG_RESTORE
])
if test "$ac_cv_cxx_explinst" = yes; then
  AC_DEFINE(HAVE_INSTANTIATIONS,,
            [define if the compiler supports explicit instantiations])
fi
])

AC_DEFUN([AC_DEFINE_DIR], [ 
  ac_expanded=`( 
    test "x$prefix" = xNONE && prefix="$ac_default_prefix" 
    test "x$exec_prefix" = xNONE && exec_prefix="${prefix}" 
    eval echo \""[$]$2"\" 
  )` 
  ifelse($3, , 
    AC_DEFINE_UNQUOTED($1, "$ac_expanded"), 
    AC_DEFINE_UNQUOTED($1, "$ac_expanded", $3)) 
]) 

dnl @synopsis AC_CXX_MUTABLE
dnl
dnl If the compiler allows modifying class data members flagged with
dnl the mutable keyword even in const objects (for example in the
dnl body of a const member function), define HAVE_MUTABLE.
dnl
dnl @version $Id: acinclude.m4,v 1.9.2.1 2004/06/30 13:16:25 keichwa Exp $
dnl @author Luc Maisonobe
dnl
AC_DEFUN([AC_CXX_MUTABLE],
[AC_CACHE_CHECK(whether the compiler supports the mutable keyword,
ac_cv_cxx_mutable,
[AC_LANG_SAVE
 AC_LANG_CPLUSPLUS
 AC_TRY_COMPILE([
class A { mutable int i;
          public:
          int f (int n) const { i = n; return i; }
        };
],[A a; return a.f (1);],
 ac_cv_cxx_mutable=yes, ac_cv_cxx_mutable=no)
 AC_LANG_RESTORE
])
if test "$ac_cv_cxx_mutable" = yes; then
  AC_DEFINE(HAVE_MUTABLE,,[define if the compiler supports the mutable keyword])
fi
])
