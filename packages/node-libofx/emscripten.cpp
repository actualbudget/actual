#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "libofx/inc/libofx.h"
#include "emscripten.h"

extern "C" {
    void set_ofx_version(OfxFiLogin *login, char *version) {
        strncpy(login->header_version, version, OFX_HEADERVERSION_LENGTH - 1);
    }
    
    void set_app_version(OfxFiLogin *login, char *version) {
        strncpy(login->appver, version, OFX_APPVER_LENGTH - 1);
    }
    
    void set_app_id(OfxFiLogin *login, char *id) {
        strncpy(login->appid, id, OFX_APPID_LENGTH - 1);
    }

    OfxAccountData *copy_account(OfxAccountData *acct) {
        OfxAccountData *target = (OfxAccountData*)malloc(sizeof(OfxAccountData));
        *target = *acct;
        return target;
    }

    // OfxAccountData *make_account(int type, char* acct, char* bank=NULL, char* broker=NULL) {
    //     OfxAccountData *account = (OfxAccountData*)malloc(sizeof(OfxAccountData));
    //     memset(account, 0, sizeof(OfxAccountData));

    //     switch(type) {
    //     case 1:
    //         account->account_type = account->OFX_CHECKING;
    //     case 2:
    //         account->account_type = account->OFX_INVESTMENT;
    //     case 3:
    //         account->account_type = account->OFX_CREDITCARD;
    //     }

    //     strncpy(account->account_number, acct, OFX_ACCTID_LENGTH - 1);

    //     if(bank != NULL) {
    //         strncpy(account->bank_id, bank, OFX_BANKID_LENGTH - 1);
    //     }

    //     if(broker != NULL) {
    //         strncpy(account->broker_id, broker, OFX_BROKERID_LENGTH - 1);
    //     }

    //     return account;
    // }

    // Account accessors

    // char* acct_number(OfxAccountData *acct) {
    //     return acct->account_number;
    // }

    // char* acct_name(OfxAccountData *acct) {
    //     return acct->account_name;
    // }

    // char* acct_bankid(OfxAccountData *acct) {
    //     return acct->bank_id;
    // }

    // int acct_type(OfxAccountData *acct) {
    //     return acct->account_type_valid;
    // }

    // Transaction accessors

    char *transaction_acct_name(OfxTransactionData *trans) {
      if (trans->account_ptr && trans->account_ptr->account_id_valid) {
        return trans->account_ptr->account_id;
      }
      return "";
    }

    double transaction_amount(OfxTransactionData *trans) {
        return trans->amount;
    }

    char* transaction_fi_id(OfxTransactionData *trans) {
        return trans->fi_id_corrected_valid ? trans->fi_id_corrected : trans->fi_id;
    }

    time_t transaction_date(OfxTransactionData *trans) {
        return trans->date_posted;
    }

    char* transaction_payee(OfxTransactionData *trans) {
        return trans->payee_id;
    }

    char* transaction_name(OfxTransactionData *trans) {
        return trans->name;
    }

    char* transaction_memo(OfxTransactionData *trans) {
        return trans->memo;
    }

    // Context

    LibofxContextPtr get_new_context() {
        LibofxContextPtr ctx = libofx_get_new_context();
        libofx_set_dtd_dir(ctx, "libofx/dtd/");
        return ctx;
    }

    // Parsing

    void parse_data(LibofxContextPtr ctx, char* res) {
        // char *name = "/tmp/fooT_ofx";
        char *name = tmpnam(0);

        FILE *fp = fopen(name, "w");
        fputs(res, fp);
        fclose(fp);

        libofx_proc_file(ctx, name, OFX);
    }
    
    void init() {
        // EM_ASM(
        //   FS.mkdir('/data');
        //   FS.mount(NODEFS, { root: './libofx' }, '/data');
        // );
    }

    void debug() {
        // ofx_PARSER_msg = true;
        // ofx_DEBUG_msg = true;
        // ofx_DEBUG1_msg = true;
        // ofx_WARNING_msg = true;
        ofx_ERROR_msg = true;
        // ofx_INFO_msg = true;
        // ofx_STATUS_msg = true;
    }
}
