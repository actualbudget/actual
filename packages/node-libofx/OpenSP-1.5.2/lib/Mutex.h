// Copyright (c) 1996 James Clark
// See the file copying.txt for copying permission.

#ifndef Mutex_INCLUDED
#define Mutex_INCLUDED 1

#ifdef SP_MUTEX_WIN32
#define SP_MUTEX

#define STRICT 1
#include <windows.h>
// <windows.h> appears to turn these warnings back on
#ifdef _MSC_VER
#pragma warning ( disable : 4237 )
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Mutex {
public:
  class Lock {
  public:
    Lock(Mutex *mp) : mp_(mp) {
      if (mp) ::EnterCriticalSection(&mp->cs_);
    }
    ~Lock() {
      if (mp_) ::LeaveCriticalSection(&mp_->cs_);
    }
  private:
    Mutex *mp_;
  };
  Mutex() {
    ::InitializeCriticalSection(&cs_);
  }
  ~Mutex() {
    ::DeleteCriticalSection(&cs_);
  }
  friend class Lock;
private:
  CRITICAL_SECTION cs_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MUTEX_WIN32 */

#ifdef SP_MUTEX_MACH
#define SP_MUTEX

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MUTEX_MACH */

#ifdef SP_MUTEX_PTHREADS

// Support for pthreads on Linux.
// Written by Matthias Clasen <clasen@mathematik.uni-freiburg.de>

#define SP_MUTEX

extern "C" {
#include <pthread.h>
}

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Mutex {
public:
  class Lock {
  // Lock serves to automatically unlock Mutex, however control leaves
  // a block. Don't let any "warning: unused variable `class Mutex::Lock lock'"
  // mislead you; hopefully your compiler won't optimise this away...
  public:
    Lock(Mutex *mp) : mp_(mp) { if (mp_) pthread_mutex_lock  (&mp_->cs_); }
    ~Lock()                   { if (mp_) pthread_mutex_unlock(&mp_->cs_); }
  private:
    Mutex *mp_;
  };
  Mutex()  { pthread_mutex_init (&cs_, NULL); }
  ~Mutex() { pthread_mutex_destroy (&cs_); }
  friend class Lock;
private:
  pthread_mutex_t cs_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MUTEX_PTHREADS */

#ifndef SP_MUTEX

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Mutex {
public:
  class Lock {
  public:
    Lock(Mutex *) { }
  };
  Mutex() { }
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not SP_MUTEX */

#endif /* not Mutex_INCLUDED */
