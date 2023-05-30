contract Test {
    use dep::aztec3::abi;
    use dep::aztec3::abi::Inputs;
    use dep::aztec3::abi::PrivateCircuitPublicInputs;
    use dep::aztec3::context::private::PrivateFunctionContext;

    fn constructor(
        inputs: pub Inputs,
    ) -> distinct pub PrivateCircuitPublicInputs {
        PrivateFunctionContext::new(inputs).finish()
    }
}
