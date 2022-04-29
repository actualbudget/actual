/***************************************************************************
                          ofx_proc_rs.h
                             -------------------
    copyright            : (C) 2002 by Benoit Gr�goire
    email                : benoitg@coeus.ca
***************************************************************************/
/**@file
 * \brief LibOFX internal object code.
 *
 * These objects will process the elements returned by ofx_sgml.cpp and add them to their data members.
 * \warning Object documentation is not yet complete.
 */
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/
#ifndef OFX_PROC_H
#define OFX_PROC_H
#include "libofx.h"
#include "tree.hh"
#include "context.hh"

using namespace std;

/** \brief A generic container for an OFX SGML element.  Every container inherits from OfxGenericContainer.
 *
 A hierarchy of containers is built as the file is parsed.  The supported OFX elements all have a matching container.  The others are assigned a OfxDummyContainer, so every OFX element creates a container as the file is par Note however that containers are destroyed as soon as the corresponding SGML element is closed.
*/
class OfxGenericContainer
{
public:
  string type;/**< The type of the object, often == tag_identifier */
  string tag_identifier; /**< The identifer of the creating tag */
  OfxGenericContainer *parentcontainer;
  LibofxContext *libofx_context;

  OfxGenericContainer(LibofxContext *p_libofx_context);
  OfxGenericContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer);
  OfxGenericContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier);

  virtual ~OfxGenericContainer() {};

  /** \brief Add data to a container object.
   *
   Must be called once completed parsing an OFX SGML data element.  The parent container should know what to do with it.
   \param identifier The name of the data element
   \param value The concatenated string of the data
  */
  virtual void add_attribute(const string identifier, const string value);
  /** \brief Generate libofx.h events.
   *
   gen_event will call the appropriate ofx_proc_XXX_cb defined in libofx.h if one is available.
   \return true if a callback function vas called, false otherwise.
  */
  virtual int gen_event();

  /** \brief Add this container to the main tree.
   *
   add_to_main_treegen_event will add the container to the main trees stored int the OfxMainContainer.
   \return true if successfull, false otherwise.
  */
  virtual int add_to_main_tree();

  /// Returns the parent container object (the one representing the containing OFX SGML element)
  OfxGenericContainer* getparent();
};//End class OfxGenericObject

/** \brief A container to holds OFX SGML elements that LibOFX knows nothing about
 *
 The OfxDummyContainer is used for elements (not data elements) that are not recognised.  Note that recognised objects may very well be a children of an OfxDummyContainer.
*/
class OfxDummyContainer: public OfxGenericContainer
{
public:
  OfxDummyContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier);
  void add_attribute(const string identifier, const string value);
};

/** \brief A container to hold a OFX SGML element for which you want the parent to process it's data elements
 *
 When you use add_attribute on an OfxPushUpContainer, the add_attribute is redirected to the parent container.
*/
class OfxPushUpContainer: public OfxGenericContainer
{
public:

  OfxPushUpContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier);
  void add_attribute(const string identifier, const string value);
};

/** \brief Represents the <STATUS> OFX SGML entity */
class OfxStatusContainer: public OfxGenericContainer
{
public:
  OfxStatusData data;

  OfxStatusContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier);
  ~OfxStatusContainer();
  void add_attribute(const string identifier, const string value);
};

/** \brief Represents the <BALANCE> OFX SGML entity
 *
 OfxBalanceContainer is an auxiliary container (there is no matching data object in libofx.h)
*/
class OfxBalanceContainer: public OfxGenericContainer
{
public:
  /* Not yet complete see spec 1.6 p.63 */
  //char name[OFX_BALANCE_NAME_LENGTH];
  //char description[OFX_BALANCE_DESCRIPTION_LENGTH];
  //enum BalanceType{DOLLAR, PERCENT, NUMBER} balance_type;
  double amount; /**< Interpretation depends on balance_type */
  int amount_valid;
  time_t date; /**< Effective date of the given balance */
  int date_valid;

  OfxBalanceContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier);
  ~OfxBalanceContainer();
  void add_attribute(const string identifier, const string value);
};

/***************************************************************************
 *                          OfxStatementContainer                          *
 ***************************************************************************/
/** \brief  Represents a statement for either a bank account or a credit card account.
 *
 Can be built from either a <STMTRS> or a <CCSTMTRS> OFX SGML entity
 */
class OfxStatementContainer: public OfxGenericContainer
{
public:
  OfxStatementData data;

  OfxStatementContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier);
  ~OfxStatementContainer();
  void add_attribute(const string identifier, const string value);
  virtual int add_to_main_tree();
  virtual int gen_event();
  void add_account(OfxAccountData * account_data);
  void add_balance(OfxBalanceContainer* ptr_balance_container);
//  void add_transaction(const OfxTransactionData transaction_data);

};

/***************************************************************************
 *                           OfxAccountContaine r                          *
 ***************************************************************************/
/** \brief  Represents a bank account or a credit card account.
 *
 Can be built from either a <BANKACCTFROM> or <CCACCTFROM> OFX SGML entity
 */
class OfxAccountContainer: public OfxGenericContainer
{
public:
  OfxAccountData data;

  OfxAccountContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier);
  ~OfxAccountContainer();
  void add_attribute(const string identifier, const string value);
  int add_to_main_tree();
  virtual int gen_event();
private:
  void gen_account_id(void);
  char bankid[OFX_BANKID_LENGTH];
  char branchid[OFX_BRANCHID_LENGTH];
  char acctid[OFX_ACCTID_LENGTH];/**< This field is used by both <BANKACCTFROM> and <CCACCTFROM> */
  char acctkey[OFX_ACCTKEY_LENGTH];
  char brokerid[OFX_BROKERID_LENGTH];
};

/***************************************************************************
 *                           OfxSecurityContainer                          *
 ***************************************************************************/
/** \brief  Represents a security, such as a stock or bond.
 */
class OfxSecurityContainer: public OfxGenericContainer
{
public:
  OfxSecurityData data;

  OfxSecurityContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier);
  ~OfxSecurityContainer();
  void add_attribute(const string identifier, const string value);
  virtual int gen_event();
  virtual int add_to_main_tree();
private:
  OfxStatementContainer * parent_statement;
};


/***************************************************************************
 *                        OfxTransactionContainer                          *
 ***************************************************************************/
/** \brief  Represents a generic transaction.
 */
class OfxTransactionContainer: public OfxGenericContainer
{
public:
  OfxTransactionData data;

  OfxTransactionContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier);
  ~OfxTransactionContainer();
  virtual void add_attribute(const string identifier, const string value);
  void add_account(OfxAccountData * account_data);

  virtual int gen_event();
  virtual int add_to_main_tree();
private:
  OfxStatementContainer * parent_statement;
};

/** \brief  Represents a bank or credid card transaction.
 *
 Built from <STMTTRN> OFX SGML entity
 */
class OfxBankTransactionContainer: public OfxTransactionContainer
{
public:
  OfxBankTransactionContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier);
  void add_attribute(const string identifier, const string value);
};

/** \brief  Represents a bank or credid card transaction.
 *
 Built from the diferent investment transaction OFX entity
 */
class OfxInvestmentTransactionContainer: public OfxTransactionContainer
{
public:
  OfxInvestmentTransactionContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier);

  void add_attribute(const string identifier, const string value);
};

/***************************************************************************
 *                             OfxMainContainer                            *
 ***************************************************************************/
/** \brief The root container.  Created by the <OFX> OFX element or by the export functions.
 *
 The OfxMainContainer maintains trees of processed ofx data structures which can be used to generate events in the right order, and eventually export in OFX and QIF formats and even generate matching OFX querys.
*/
class OfxMainContainer: public OfxGenericContainer
{
public:
  OfxMainContainer(LibofxContext *p_libofx_context, OfxGenericContainer *para_parentcontainer, string para_tag_identifier);
  ~OfxMainContainer();
  int add_container(OfxGenericContainer * container);
  int add_container(OfxStatementContainer * container);
  int add_container(OfxAccountContainer * container);
  int add_container(OfxTransactionContainer * container);
  int add_container(OfxSecurityContainer * container);
  int gen_event();
  OfxSecurityData * find_security(string unique_id);
private:
  tree<OfxGenericContainer *> security_tree;
  tree<OfxGenericContainer *> account_tree;
};


#endif
