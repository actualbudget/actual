// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Resource_INCLUDED
#define Resource_INCLUDED 1

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API Resource {
public:
  Resource();
  Resource(const Resource &);
  int unref();			// return 1 if it should be deleted
  void ref();
  int count() const;
private:
  int count_;
};

inline
Resource::Resource()
: count_(0)
{
}

inline
Resource::Resource(const Resource &)
: count_(0)
{
}

inline
int Resource::count() const
{
  return count_;
}

inline
int Resource::unref()
{
  return --count_ <= 0;
}

inline
void Resource::ref()
{
  ++count_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Resource_INCLUDED */
