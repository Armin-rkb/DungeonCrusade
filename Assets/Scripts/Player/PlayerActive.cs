using UnityEngine;
using System.Collections;

public class PlayerActive : MonoBehaviour {


    [SerializeField]
    private PlayerMovement _checkPort;


    public delegate void IsPlayerActive(PlayerActive player);

    public static event IsPlayerActive ResetHearts;
    public static event IsPlayerActive CheckP1Active;
    public static event IsPlayerActive CheckP2Active;


	void Start () 
    {
        if (ResetHearts != null)
            ResetHearts(this);

	if (CheckP1Active != null)
    {
        if (_checkPort.PlayerNumber == 1)
        CheckP1Active(this);
    }

    if (CheckP2Active != null)
    {
        if (_checkPort.PlayerNumber == 2)
            CheckP2Active(this);
    }
	}
	

}
