#include "protogalaxy_prover.hpp"
#include "barretenberg/proof_system/flavor/flavor.hpp"
namespace proof_system::honk {

/**
 * @brief Prior to folding we need to add all the public inputs to the transcript, labelled by their corresponding
 * instance index, compute all the instance's polynomials and record the relation parameters involved in computing these
 * polynomials in the transcript.
 *
 */
template <class ProverInstances> void ProtoGalaxyProver_<ProverInstances>::prepare_for_folding()
{
    // this doesnt work in the current format
    auto idx = 0;
    for (auto it = instances.begin(); it != instances.end(); it++, idx++) {
        auto instance = *it;
        instance->initialise_prover_polynomials();

        auto domain_separator = std::to_string(idx);
        const auto circuit_size = static_cast<uint32_t>(instance->proving_key->circuit_size);
        const auto num_public_inputs = static_cast<uint32_t>(instance->proving_key->num_public_inputs);

        transcript.send_to_verifier(domain_separator + "_circuit_size", circuit_size);
        transcript.send_to_verifier(domain_separator + "_public_input_size", num_public_inputs);
        transcript.send_to_verifier(domain_separator + "_pub_inputs_offset",
                                    static_cast<uint32_t>(instance->pub_inputs_offset));

        for (size_t i = 0; i < instance->proving_key->num_public_inputs; ++i) {
            auto public_input_i = instance->public_inputs[i];
            transcript.send_to_verifier(domain_separator + "_public_input_" + std::to_string(i), public_input_i);
        }

        auto [eta, beta, gamma] = transcript.get_challenges(
            domain_separator + "_eta", domain_separator + "_beta", domain_separator + "_gamma");
        instance->compute_sorted_accumulator_polynomials(eta);
        instance->compute_grand_product_polynomials(beta, gamma);
    }
}

// TODO(#689): finalise implementation this function
template <class ProverInstances>
ProverFoldingResult<typename ProverInstances::Flavor> ProtoGalaxyProver_<ProverInstances>::fold_instances()
{
    prepare_for_folding();
    auto [alpha, delta] = transcript.get_challenges("alpha", "delta");
    auto accumulator = get_accumulator();
    auto instance_size = accumulator->prover_polynomials[0].size();
    auto log_instance_size = static_cast<size_t>(numeric::get_msb(instance_size));
    auto deltas = compute_round_challenge_pows(log_instance_size, delta);
    auto perturbator = compute_perturbator(accumulator, deltas, alpha);

    // Note: we shouldn't have to send the constant coefficient as this is equal to target sum and should instead have
    // the assertion in place once protogalaxy is finalised assert(perturbator_coeffs[0] ==
    // accumulator.folding_params.target_sum);
    for (size_t idx = 0; idx <= log_instance_size; idx++) {
        transcript.send_to_verifier("perturbator_" + std::to_string(idx), perturbator[idx]);
    }
    // auto value = transcript.get_challenge("evaluation_point");
    // Compute F(α)
    // auto evalutation = perturbator.evaluate(value);
    // transcript.send_to_verifier("perturbator_eval", evalutation);
    ProverFoldingResult<Flavor> res;
    res.folding_data = transcript.proof_data;
    return res;
}
template class ProtoGalaxyProver_<ProverInstances_<honk::flavor::Ultra, 2>>;
template class ProtoGalaxyProver_<ProverInstances_<honk::flavor::UltraGrumpkin, 2>>;
template class ProtoGalaxyProver_<ProverInstances_<honk::flavor::GoblinUltra, 2>>;
} // namespace proof_system::honk