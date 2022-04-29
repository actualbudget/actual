/***************************************************************************
                          ofx_aggregate.hh
                             -------------------
    copyright            : (C) 2005 by Ace Jones
    email                : acejones@users.sourceforge.net
***************************************************************************/
/**@file
 * \brief Declaration of OfxAggregate which allows you to construct a single
 *    OFX aggregate.
*/
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/

#ifndef OFX_AGGREGATE_H
#define OFX_AGGREGATE_H

#include <string>

using namespace std;

/**
 * \brief A single aggregate as described in the OFX 1.02 specification
 *
 * This aggregate has a tag, and optionally a number of subordinate elements and aggregates.
 *
 * An example is:
 *  <CCACCTINFO>            <!-- Begins an aggregate, with the tag 'CCACCTINFO' -->
 *    <CCACCTFROM>          <!-- Begins a subordinate aggregate, with the tag 'CCACCTFROM' -->
 *      <ACCTID>1234        <!-- Subordinate element, with tag 'ACCTID', data '1234' -->
 *    </CCACCTFROM>         <!-- Ends the CCACCTFROM aggregate -->
 *    <SUPTXDL>Y            <!-- Subordinate element, with tag 'SUPTXDL', data 'Y' -->
 *    <SVCSTATUS>ACTIVE
 *  </CCACCTINFO>           <!-- Ends the CCACCTINFO aggregate -->
*/

class OfxAggregate
{
public:
  /**
    * Creates a new aggregate, using this tag
    *
    * @param tag The tag of this aggregate
    */
  OfxAggregate( const string& tag ): m_tag( tag )
  {}

  /**
    * Adds an element to this aggregate
    *
    * @param tag The tag of the element to be added
    * @param data The data of the element to be added
    */
  void Add( const string& tag, const string& data )
  {
    m_contents += string("<") + tag + string(">") + data + string("\r\n");
  }

  /**
    * Adds a subordinate aggregate to this aggregate
    *
    * @param sub The aggregate to be added
   */
  void Add( const OfxAggregate& sub )
  {
    m_contents += sub.Output();
  }

  /**
    * Composes this aggregate into a string
    *
    * @return string form of this aggregate
    */
  string Output( void ) const
  {
    return string("<") + m_tag + string(">\r\n") + m_contents + string("</") + m_tag + string(">\r\n");
  }

private:
  string m_tag;
  string m_contents;
};

#endif // OFX_AGGREGATE_H
