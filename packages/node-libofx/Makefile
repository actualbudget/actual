
all: opensp ofx finalweb finalnode

final: finalweb finalnode

finalweb:
	$(MAKE) EMCC_FLAGS="-s ENVIRONMENT=\"worker\"" EMCC_OUTPUT_FILE="libofx.web.js" wasm

finalnode:
	$(MAKE) EMCC_OUTPUT_FILE="libofx.electron.js" wasm

wasm: 
	emcc emscripten.cpp -O2 libofx/lib/.libs/libofx.dylib OpenSP-1.5.2/lib/.libs/libosp.dylib \
		-s EXPORTED_FUNCTIONS="['_init', '_debug', '_set_ofx_version', '_set_app_id', '_set_app_version', '_parse_data', '_get_new_context', '_ofx_set_statement_cb', '_ofx_set_account_cb', '_ofx_set_transaction_cb', '_transaction_amount', '_transaction_fi_id', '_transaction_date', '_transaction_payee', '_transaction_name', '_transaction_memo']" \
        -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap", "addFunction"]' \
        -s RESERVED_FUNCTION_POINTERS=10 \
		-s MODULARIZE=1 \
		$(EMCC_FLAGS) \
        --embed-file libofx/dtd/ofx160.dtd \
        --embed-file libofx/dtd/ofx201.dtd \
        --embed-file libofx/dtd/ofc.dtd \
        --embed-file libofx/dtd/opensp.dcl \
		-o $(EMCC_OUTPUT_FILE)

opensp:
	cd OpenSP-1.5.2 && emconfigure ./configure --disable-doc-build
	sed -i -e 's/\/\* \#undef HAVE_NAMESPACE_STD \*\//\#define HAVE_NAMESPACE_STD/g' OpenSP-1.5.2/config.h
	sed -i -e 's/\/\* \#undef HAVE_MEMMOVE \*\//\#define HAVE_MEMMOVE 1/g' OpenSP-1.5.2/config.h
	sed -i -e 's/\#define ptrdiff_t long/\/*\#define ptrdiff_t  long\*\//g' OpenSP-1.5.2/config.h
	cd OpenSP-1.5.2 && emmake make

ofx:
	cd libofx && emconfigure ./configure --verbose --without-iconv --with-opensp-includes=/Users/james/projects/actual/packages/node-libofx/OpenSP-1.5.2/generic --with-opensp-libs=/Users/james/projects/actual/packages/node-libofx/OpenSP-1.5.2/lib/.libs
	cd libofx && emmake make

clean:
	cd libofx && make clean
	cd OpenSP-1.5.2 && make clean
