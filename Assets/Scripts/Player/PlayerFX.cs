using UnityEngine;
using System.Collections;

public class PlayerFX : MonoBehaviour {

    [SerializeField]
    private FXManager _fxManager;

    [SerializeField]
    private PlayerMovement _checkPort;

    
	void Start () 
    {
        _fxManager.PlayFX(0, transform.position);

       // HealthPlayer.OnP1Death += DeathFX;
        //HealthPlayer.OnP2Death += DeathFX;
	}
	

    void DeathFX(HealthPlayer player)
    { 
        _fxManager.PlayFX(1, transform.position);
    }

}
