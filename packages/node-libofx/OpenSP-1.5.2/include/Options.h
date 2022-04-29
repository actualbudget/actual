// Copyright (c) 1996 James Clark, 1999 Matthias Clasen
// See the file COPYING for copying permission.

#ifndef Options_INCLUDED
#define Options_INCLUDED 1

#include "Boolean.h"
#include "Vector.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

// This is a mildly C++ified version of getopt().
// (extended to include getopt_long() functionality.)
// It never prints any message.

template<class T>
class LongOption {
public:
  const T *name;
  T key;
  T value;
  bool hasArgument;
};
 
template<class T>
class Options {
public:
  Options(int argc, T *const *, const Vector<LongOption<T> > &);
  // Returns false if there are no more options.
  bool get(T &);
  T *arg() const { return arg_; } // optarg
  T opt() const { return opt_; }  // optopt
  int ind() const { return ind_; } // optind
  int longIndex() const { return optInd_; } // longindex
private:
  bool search(T);
  bool searchLong(const T *);
  T *const *argv_;
  int argc_;
  int ind_;
  T opt_;
  T *arg_;
  int sp_;
  Vector<LongOption<T> > opts_;
  int optInd_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Options_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "Options.cxx"
#endif
