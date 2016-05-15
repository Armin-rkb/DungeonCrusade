using UnityEngine;
using System.Collections;

public class Sock : MonoBehaviour
{
    [SerializeField] private Rigidbody2D rbSock;
    //Speed of the bullet
    [SerializeField] private float speed;
    //Amout of damage that the bullet will deal
    [SerializeField] private float damage;
    //Time left for explosion
    [SerializeField] private float explodeTime;
    //Explosion object
    [SerializeField] private GameObject explosionObj;
    private bool isRight;
    private bool isLeft;
    private bool bounce;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
    }

    void FixedUpdate()
    {
        //Time left for explosion
        explodeTime--;

        if (isRight)
            rbSock.velocity = new Vector2(speed, rbSock.velocity.y);
        else if (isLeft)
            rbSock.velocity = new Vector2(-speed, rbSock.velocity.y);

        if (bounce)
        {
            speed = 1;
            bounce = false;
        }

        if (explodeTime < 0)
        {
            Instantiate(explosionObj, transform.position, transform.rotation);
            Destroy(this.gameObject);
        }
    }

    void Hit(GameObject player)
    {
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage);
        //Give the player knockback
        Rigidbody2D rb = player.GetComponent<Rigidbody2D>();
        rb.AddForce(player.transform.right * 500);
        print("push");
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.tag == "Player")
            {
                Hit(coll.gameObject);
                Destroy(this.gameObject);
            }

            else if (coll.gameObject.tag == "Ground")
            {
                bounce = true;
            }

            else
                Destroy(this.gameObject);
        }
    }
}
