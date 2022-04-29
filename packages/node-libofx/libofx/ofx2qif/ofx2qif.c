/***************************************************************************
                                   ofx2qif.c
                             -------------------
    copyright            : (C) 2002 by Benoit Gr�goire
    email                : benoitg@coeus.ca
***************************************************************************/
/**@file
 * \brief Code for ofx2qif utility.  C example code
 *
 * ofx2qif is a OFX "file" to QIF (Quicken Interchange Format)
 converter.  It was written as a second code example, and as a way for LibOFX
 to immediately provide something usefull, and to give people a reason to try
 the library.  It is not recommended that financial software use the
 output of this utility for OFX support.  The QIF file format is very
 primitive, and much information is lost.  The utility curently supports
 every tansaction tags of the QIF format except the address lines, and supports
 many of the !Account tags.  It should generate QIF files that will import 
 sucesfully in just about every software with QIF support.
 *
 * I do not plan on improving working this utility much further, however be I 
 would be more than happy to accept contributions.  If you are interested in 
 hacking on ofx2qif, links to QIF documentation are available on the LibOFX
 home page.
 *
 * ofx2qif is meant to be the C code example and demo of the library.  It uses
 many of the functions and structures of the LibOFX API.  Note that unlike 
 ofxdump, all error output is disabled by default.
 *
 * usage: ofx2qif path_to_ofx_file/ofx_filename > output_filename.qif
 */

/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/

#include <stdio.h>
#include <string.h>
#include <time.h>
#include "libofx.h"

#define QIF_FILE_MAX_SIZE 256000

int ofx_proc_transaction_cb(const struct OfxTransactionData data, void * transaction_data)
{
  char dest_string[255];
  char trans_buff[4096];
  struct tm temp_tm;
  char trans_list_buff[QIF_FILE_MAX_SIZE];

  trans_list_buff[0]='\0';
  
  if(data.date_posted_valid==true){
    temp_tm = *localtime(&(data.date_posted));
    sprintf(trans_buff, "D%d%s%d%s%d%s", temp_tm.tm_mday, "/", temp_tm.tm_mon+1, "/", temp_tm.tm_year+1900, "\n");
    strncat(trans_list_buff, trans_buff, sizeof(trans_list_buff)-1 - strlen(trans_list_buff));
  }
  if(data.amount_valid==true){
    sprintf(trans_buff, "T%.2f%s",data.amount,"\n");
    strncat(trans_list_buff, trans_buff, sizeof(trans_list_buff)-1 - strlen(trans_list_buff));
  }
  if(data.check_number_valid==true){
    sprintf(trans_buff, "N%s%s",data.check_number,"\n");
    strncat(trans_list_buff, trans_buff, sizeof(trans_list_buff)-1 - strlen(trans_list_buff));
  }
  else if(data.reference_number_valid==true){
    sprintf(trans_buff, "N%s%s",data.reference_number,"\n");
      strncat(trans_list_buff, trans_buff, sizeof(trans_list_buff)-1 - strlen(trans_list_buff));
}
if(data.name_valid==true){
    sprintf(trans_buff, "P%s%s",data.name,"\n");
        strncat(trans_list_buff, trans_buff, sizeof(trans_list_buff)-1 - strlen(trans_list_buff));
}
if(data.memo_valid==true){
    sprintf(trans_buff, "M%s%s",data.memo,"\n");
        strncat(trans_list_buff, trans_buff, sizeof(trans_list_buff)-1 - strlen(trans_list_buff));
}
/* Add PAYEE and ADRESS here once supported by the library */


if(data.transactiontype_valid==true){
    switch(data.transactiontype){
        case OFX_CREDIT: strncpy(dest_string, "Generic credit", sizeof(dest_string));
        break;
        case OFX_DEBIT: strncpy(dest_string, "Generic debit", sizeof(dest_string));
        break;
        case OFX_INT: strncpy(dest_string, "Interest earned or paid (Note: Depends on signage of amount)", sizeof(dest_string));
        break;
        case OFX_DIV: strncpy(dest_string, "Dividend", sizeof(dest_string));
        break;
        case OFX_FEE: strncpy(dest_string, "FI fee", sizeof(dest_string));
        break;
        case OFX_SRVCHG: strncpy(dest_string, "Service charge", sizeof(dest_string));
        break;
        case OFX_DEP: strncpy(dest_string, "Deposit", sizeof(dest_string));
        break;
        case OFX_ATM: strncpy(dest_string, "ATM debit or credit (Note: Depends on signage of amount)", sizeof(dest_string));
        break;
        case OFX_POS: strncpy(dest_string, "Point of sale debit or credit (Note: Depends on signage of amount)", sizeof(dest_string));
        break;
        case OFX_XFER: strncpy(dest_string, "Transfer", sizeof(dest_string));
        break;
        case OFX_CHECK: strncpy(dest_string, "Check", sizeof(dest_string));
        break;
        case OFX_PAYMENT: strncpy(dest_string, "Electronic payment", sizeof(dest_string));
        break;
        case OFX_CASH: strncpy(dest_string, "Cash withdrawal", sizeof(dest_string));
        break;
        case OFX_DIRECTDEP: strncpy(dest_string, "Direct deposit", sizeof(dest_string));
        break;
        case OFX_DIRECTDEBIT: strncpy(dest_string, "Merchant initiated debit", sizeof(dest_string));
        break;
        case OFX_REPEATPMT: strncpy(dest_string, "Repeating payment/standing order", sizeof(dest_string));
        break;
        case OFX_OTHER: strncpy(dest_string, "Other", sizeof(dest_string));
        break;
        default : strncpy(dest_string, "Unknown transaction type", sizeof(dest_string));
        break;
    }
    sprintf(trans_buff, "L%s%s",dest_string,"\n");
    strncat(trans_list_buff, trans_buff, sizeof(trans_list_buff)-1 - strlen(trans_list_buff));
}
 strcpy(trans_buff, "^\n");
 strncat(trans_list_buff, trans_buff, sizeof(trans_list_buff)-1 - strlen(trans_list_buff));
 fputs(trans_list_buff,stdout);
 return 0;
}/* end ofx_proc_transaction() */

int ofx_proc_statement_cb(const struct OfxStatementData data, void * statement_data)
{
  struct tm temp_tm;

  printf("!Account\n");
  if(data.account_id_valid==true){
    /* Use the account id as the qif name of the account */
    printf("N%s%s",data.account_id,"\n");
  }
  if(data.account_ptr->account_type_valid==true)
    {
      switch(data.account_ptr->account_type){
      case OFX_CHECKING : printf("TBank\n");
	break;
      case OFX_SAVINGS :  printf("TBank\n");
	break;
      case OFX_MONEYMRKT :  printf("TOth A\n");
	break;
      case OFX_CREDITLINE :  printf("TOth L\n");
	break;
      case OFX_CMA :  printf("TOth A\n");
	break;
      case OFX_CREDITCARD :   printf("TCCard\n");
	break;
      default: perror("WRITEME: ofx_proc_account() This is an unknown account type!");
      }
    }
  printf("DOFX online account\n");

  if(data.ledger_balance_date_valid==true){
    temp_tm = *localtime(&(data.ledger_balance_date));
    printf("/%d%s%d%s%d%s", temp_tm.tm_mday, "/", temp_tm.tm_mon+1, "/", temp_tm.tm_year+1900, "\n");
  }
  if(data.ledger_balance_valid==true){
    printf("$%.2f%s",data.ledger_balance,"\n");
  }
  printf("^\n");
  /*The transactions will follow, here is the header */
  if(data.account_ptr->account_type_valid==true){
    switch(data.account_ptr->account_type){
    case OFX_CHECKING : printf("!Type:Bank\n");
      break;
    case OFX_SAVINGS : printf("!Type:Bank\n");
      break;
    case OFX_MONEYMRKT : printf("!Type:Oth A\n");
      break;
    case OFX_CREDITLINE : printf("!Type:Oth L\n");
      break;
    case OFX_CMA : printf("!Type:Oth A\n");
      break;
    case OFX_CREDITCARD : printf("!Type:CCard\n");
      break;
    default: perror("WRITEME: ofx_proc_account() This is an unknown account type!");
    }
  }

  return 0;
}/* end ofx_proc_statement() */
  
int ofx_proc_account_cb(const struct OfxAccountData data, void * account_data)
{
  char dest_string[255]="";
  
  
  //    strncat(trans_list_buff, dest_string, QIF_FILE_MAX_SIZE - strlen(trans_list_buff));
  fputs(dest_string,stdout);
 return 0;
}/* end ofx_proc_account() */

int main (int argc, char *argv[])
{
 ofx_PARSER_msg = false;
 ofx_DEBUG_msg = false;
 ofx_WARNING_msg = false;
 ofx_ERROR_msg = false;
 ofx_INFO_msg = false;
 ofx_STATUS_msg = false;

 LibofxContextPtr libofx_context = libofx_get_new_context();
 ofx_set_statement_cb(libofx_context, ofx_proc_statement_cb, 0);
 ofx_set_account_cb(libofx_context, ofx_proc_account_cb, 0);
 ofx_set_transaction_cb(libofx_context, ofx_proc_transaction_cb, 0);

 if(argc >= 2){
   libofx_proc_file(libofx_context, argv[1], OFX);
 }
 return libofx_free_context(libofx_context);
}





