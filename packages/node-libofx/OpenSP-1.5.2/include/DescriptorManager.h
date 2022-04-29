// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef DescriptorManager_INCLUDED
#define DescriptorManager_INCLUDED 1

#include "Boolean.h"
#include "List.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class DescriptorManager;

class SP_API DescriptorUser {
public:
  DescriptorUser(DescriptorManager *);
  virtual ~DescriptorUser();
  virtual Boolean suspend();
  void managerDeleted();
  void acquireD();
  void releaseD();
  DescriptorManager *manager() const;
private:
  DescriptorManager *manager_;
};

class SP_API DescriptorManager {
public:
  DescriptorManager(int maxD);
  ~DescriptorManager();
  void acquireD();
  void releaseD();
  void addUser(DescriptorUser *);
  void removeUser(DescriptorUser *);
private:
  DescriptorManager(const DescriptorManager &);	// undefined
  void operator=(const DescriptorManager &);	// undefined

  int usedD_;
  int maxD_;
  List<DescriptorUser *> users_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not DescriptorManager_INCLUDED */
