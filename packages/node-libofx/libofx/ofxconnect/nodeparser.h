/***************************************************************************
                             nodeparser.cpp 
                             -------------------
    copyright            : (C) 2005 by Ace Jones
    email                : acejones@users.sourceforge.net
***************************************************************************/
/**@file
 * \brief Declaration of nodeparser object, which facilitiates searching
 * for nodes in an XML file using a notation similiar to XPath.
*/
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/

#ifndef NODEPARSER_H
#define NODEPARSER_H

#include <string>
#include <vector>
#include <libxml++/libxml++.h>

class NodeParser: public xmlpp::Node::NodeList
{
public:
  NodeParser(void) {}
  NodeParser(const xmlpp::Node::NodeList&);
  NodeParser(const xmlpp::Node*);
  NodeParser(const xmlpp::DomParser&);

  NodeParser Path(const std::string& path) const;
  NodeParser Select(const std::string& key, const std::string& value) const;
  std::vector<std::string> Text(void) const;

protected:
  static NodeParser Path(const xmlpp::Node* node,const std::string& path);
};


#endif // NODEPARSER_H
