// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "DescriptorManager.h"
#include "ListIter.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

DescriptorUser::DescriptorUser(DescriptorManager *manager)
: manager_(manager)
{
  if (manager_)
    manager_->addUser(this);
}

DescriptorUser::~DescriptorUser()
{
  if (manager_)
    manager_->removeUser(this);
}

void DescriptorUser::managerDeleted()
{
  manager_ = 0;
}

Boolean DescriptorUser::suspend()
{
  return 0;
}

void DescriptorUser::acquireD()
{
  if (manager_)
    manager_->acquireD();
}

void DescriptorUser::releaseD()
{
  if (manager_)
    manager_->releaseD();
}

DescriptorManager::DescriptorManager(int maxD)
: maxD_(maxD), usedD_(0)
{
}

DescriptorManager::~DescriptorManager()
{
  for (ListIter<DescriptorUser *> iter(users_);
       !iter.done();
       iter.next())
    iter.cur()->managerDeleted();
}

void DescriptorManager::addUser(DescriptorUser *p)
{
  users_.insert(p);
}

void DescriptorManager::removeUser(DescriptorUser *p)
{
  users_.remove(p);
}

void DescriptorManager::acquireD()
{
  if (usedD_ >= maxD_) {
    for (ListIter<DescriptorUser *> iter(users_);
	 !iter.done();
	 iter.next()) {
      if (iter.cur()->suspend())
	break;
    }
  }
  usedD_++;
}

void DescriptorManager::releaseD()
{
  usedD_--;
}

#ifdef SP_NAMESPACE
}
#endif
