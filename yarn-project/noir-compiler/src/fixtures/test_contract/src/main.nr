contract TestContract {
    use dep::test::module::foo;

    struct CallContext {
        baz: Field,
    }

    struct Inputs {
        context: CallContext,
    }

    fn constructor(_inputs: Inputs, param: Field, pub_param: pub Field) -> pub [Field; 2] {
        [foo::bar(param), param + pub_param]
    }

    open fn openFunction(_context: CallContext, _padding: [Field; 8]) -> pub Field {
        42
    }

}
