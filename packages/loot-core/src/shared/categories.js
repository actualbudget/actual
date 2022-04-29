export function addCategory(categoryGroups, cat) {
  return categoryGroups.map(group => {
    if (group.id === cat.cat_group) {
      group.categories = [cat, ...group.categories];
    }
    return { ...group };
  });
}

export function updateCategory(categoryGroups, category) {
  return categoryGroups.map(group => {
    if (group.id === category.cat_group) {
      group.categories = group.categories.map(c => {
        if (c.id === category.id) {
          return { ...c, ...category };
        }
        return c;
      });
    }
    return group;
  });
}

export function moveCategory(categoryGroups, id, groupId, targetId) {
  if (id === targetId) {
    return categoryGroups;
  }

  let moveCat = categoryGroups.reduce((value, group) => {
    return value || group.categories.find(cat => cat.id === id);
  }, null);

  // Update the group id on the category
  moveCat = { ...moveCat, cat_group: groupId };

  return categoryGroups.map(group => {
    if (group.id === groupId) {
      group.categories = group.categories.reduce((cats, cat) => {
        if (cat.id === targetId) {
          cats.push(moveCat);
          cats.push(cat);
        } else if (cat.id !== id) {
          cats.push(cat);
        }
        return cats;
      }, []);

      if (!targetId) {
        group.categories.push(moveCat);
      }
    } else {
      group.categories = group.categories.filter(cat => cat.id !== id);
    }

    return { ...group };
  });
}

export function moveCategoryGroup(categoryGroups, id, targetId) {
  if (id === targetId) {
    return categoryGroups;
  }

  let moveGroup = categoryGroups.find(g => g.id === id);

  categoryGroups = categoryGroups.reduce((groups, group) => {
    if (group.id === targetId) {
      groups.push(moveGroup);
      groups.push(group);
    } else if (group.id !== id) {
      groups.push(group);
    }
    return groups;
  }, []);

  if (!targetId) {
    categoryGroups.push(moveGroup);
  }

  return categoryGroups;
}

export function deleteCategory(categoryGroups, id) {
  return categoryGroups.map(group => {
    group.categories = group.categories.filter(c => c.id !== id);
    return group;
  });
}

export function addGroup(categoryGroups, group) {
  return [...categoryGroups, group];
}

export function updateGroup(categoryGroups, group) {
  return categoryGroups.map(g => {
    if (g.id === group.id) {
      return { ...g, ...group };
    }
    return g;
  });
}

export function deleteGroup(categoryGroups, id) {
  return categoryGroups.filter(g => g.id !== id);
}
