using UnityEngine;
using System.Collections;

public class PlayerTrail : MonoBehaviour {

    [SerializeField]
    private PlayerMovement _playerMovement;

    [SerializeField]
    private ParticleSystem _playerTrail;

	
	
	void Update () 
    {
        CheckCollision();
	}

    void CheckCollision()
    {
        if (_playerMovement.GetIsGrounded && Input.GetAxis(ControllerInputs.horizontalp + _playerMovement.PlayerNumber) != 0)
            _playerTrail.enableEmission = true;
        else
            _playerTrail.enableEmission = false;
            
    }
}
