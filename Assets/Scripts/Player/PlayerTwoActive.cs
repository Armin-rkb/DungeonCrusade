using UnityEngine;
using System.Collections;

public class PlayerTwoActive : MonoBehaviour {

    [SerializeField]
    private PlayerMovement _checkPort;

    public delegate void IsPlayerActive(PlayerTwoActive player);

    public static event IsPlayerActive CheckP2Active;


	void Start () 
    {
    
    if (CheckP2Active != null)
    {
        if (_checkPort.PlayerNumber == 2)
            CheckP2Active(this);
    }
	}
	

}
