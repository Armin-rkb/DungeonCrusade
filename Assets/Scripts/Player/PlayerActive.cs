using UnityEngine;
using System.Collections;

public class PlayerActive : MonoBehaviour {


    [SerializeField]
    private PlayerMovement _checkPort;


    public delegate void IsPlayerActive(PlayerActive player);


    public static event IsPlayerActive CheckP1Active;
    public static event IsPlayerActive CheckP2Active;

    public static event IsPlayerActive CheckP3Active;
    public static event IsPlayerActive CheckP4Active;

    public static event IsPlayerActive ResetP1Heart;
    public static event IsPlayerActive ResetP2Heart;

    public static event IsPlayerActive ResetP3Heart;
    public static event IsPlayerActive ResetP4Heart;


	void Start () 
    {

	if (CheckP1Active != null)
    {
        if (_checkPort.PlayerNumber == 1)
        {
            CheckP1Active(this);

            if (ResetP1Heart != null)
                ResetP1Heart(this);
        }     
    }

    if (CheckP2Active != null)
    {
        if (_checkPort.PlayerNumber == 2)
        {
            CheckP2Active(this);

            if (ResetP2Heart != null)
                ResetP2Heart(this);
        }        
    }

    if (CheckP3Active != null)
    {
        if (_checkPort.PlayerNumber == 3)
        {
            CheckP3Active(this);

            if (ResetP3Heart != null)
                ResetP3Heart(this);
        }
    }

    if (CheckP4Active != null)
    {
        if (_checkPort.PlayerNumber == 4)
        {
            CheckP4Active(this);

            if (ResetP4Heart != null)
                ResetP4Heart(this);
        }
    }
	}
}
