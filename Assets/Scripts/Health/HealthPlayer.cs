using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class HealthPlayer : MonoBehaviour, IHealth
{

    //Delegates
    public delegate void PlayerDeath(HealthPlayer player);

    public static event PlayerDeath OnP1Death;
    public static event PlayerDeath OnP2Death;
    //Delegates

    //GameObjects
    [SerializeField]
    private GameObject _roundObject;

    [SerializeField]
    private List<GameObject> _pointObjects;
    //GameObjects

    //Scripts
    private PlayerMovement _checkPort;
    private RoundManager _roundManager;

    private CameraShake _shakeCam; // NEEDS DELEGATE
    //Scripts

    public float health = 5f;

    private int playerPoint = 1;

    public int PlayerPoint
    {
        get { return playerPoint; }
    }
   
    void Start()
    {
        _roundObject = GameObject.Find("RoundManager");
        _roundManager = _roundObject.GetComponent<RoundManager>();
        _checkPort = this.GetComponent<PlayerMovement>();

        _shakeCam = GameObject.FindGameObjectWithTag("MainCamera").GetComponent<CameraShake>(); // NEEDS DELEGATE

    }


    public void ChangeHealth(float damage)
    {
        health -= damage;

        if (health <= 0)
            Death();

        _shakeCam.Shake(0.25f); // NEEDS DELEGATE
    }

    private void Death()
    {
        _roundManager = _roundObject.GetComponent<RoundManager>();
        _roundManager.StartCoroutine("AddRound");

        GrantPoint();
        
        Destroy(gameObject);
    }

    private void GrantPoint()
    {
        if (OnP1Death != null)
        {
            if (_checkPort.PlayerNumber == 2)
            {
                OnP1Death(this);
               
                Instantiate(_pointObjects[1], transform.position, Quaternion.identity);
                StartCoroutine("RemovePointObj");

            }    
        }

        if (OnP2Death != null)
        {
            if (_checkPort.PlayerNumber == 1)
            {
                OnP2Death(this);
              
                Instantiate(_pointObjects[0], transform.position, Quaternion.identity);
                StartCoroutine("RemovePointObj");
            }    
        }
    }

    private IEnumerator RemovePointObj()
    {
        GameObject[] pointobjects = GameObject.FindGameObjectsWithTag("Point");
       

        yield return new WaitForSeconds(2);

        foreach (GameObject point in _pointObjects)
        Destroy(point.gameObject);
    }
}
